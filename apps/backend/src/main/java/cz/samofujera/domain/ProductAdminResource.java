package cz.samofujera.domain;

import cz.samofujera.auth.AuthDtos;
import cz.samofujera.domain.entity.*;
import io.quarkus.hibernate.reactive.panache.PanacheQuery;
import io.quarkus.hibernate.reactive.panache.common.WithSession;
import io.quarkus.hibernate.reactive.panache.common.WithTransaction;
import io.quarkus.panache.common.Page;
import io.quarkus.panache.common.Parameters;
import io.smallrye.mutiny.Uni;
import jakarta.annotation.security.RolesAllowed;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import org.jboss.resteasy.reactive.RestResponse;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

@Path("/api/admin/products")
@ApplicationScoped
@RolesAllowed("ADMIN")
@Produces(MediaType.APPLICATION_JSON)
public class ProductAdminResource {

    @jakarta.inject.Inject
    LocalStorageService storageService;

    // ── Product CRUD ──────────────────────────────────────────

    @GET
    @WithSession
    public Uni<RestResponse<AuthDtos.ApiResponse<CatalogDtos.ProductListResponse>>> getProducts(
            @QueryParam("page") @DefaultValue("1") int page,
            @QueryParam("limit") @DefaultValue("20") int limit,
            @QueryParam("status") String status,
            @QueryParam("category") UUID categoryId,
            @QueryParam("type") String productType,
            @QueryParam("search") String search) {

        StringBuilder where = new StringBuilder();
        Parameters params = new Parameters();
        List<String> conditions = new ArrayList<>();

        if (status != null && !status.isBlank()) {
            conditions.add("status = :status");
            params.and("status", status);
        }
        if (productType != null && !productType.isBlank()) {
            conditions.add("productType = :productType");
            params.and("productType", productType);
        }
        if (search != null && !search.isBlank()) {
            conditions.add("(lower(title) like :search or lower(slug) like :search)");
            params.and("search", "%" + search.toLowerCase() + "%");
        }

        if (!conditions.isEmpty()) {
            where.append(String.join(" and ", conditions));
        }

        String query = where.length() > 0 ? where.toString() : null;
        int pageIndex = Math.max(0, page - 1);

        // If filtering by category, we need a different approach
        if (categoryId != null) {
            return filterByCategory(categoryId, query, params, pageIndex, limit);
        }

        PanacheQuery<ProductEntity> pq = query != null
                ? ProductEntity.find(query, params)
                : ProductEntity.findAll();

        return pq.page(Page.of(pageIndex, limit)).list()
                .chain(products -> pq.count().chain(total -> {
                    int totalPages = (int) Math.ceil((double) total / limit);
                    if (products.isEmpty()) {
                        return Uni.createFrom().item(RestResponse.ok(AuthDtos.ApiResponse.ok(
                                new CatalogDtos.ProductListResponse(List.of(), page, limit, total, totalPages))));
                    }
                    return enrichProductList(products).map(items ->
                            RestResponse.ok(AuthDtos.ApiResponse.ok(
                                    new CatalogDtos.ProductListResponse(items, page, limit, total, totalPages))));
                }));
    }

    private Uni<RestResponse<AuthDtos.ApiResponse<CatalogDtos.ProductListResponse>>> filterByCategory(
            UUID categoryId, String extraQuery, Parameters extraParams, int pageIndex, int limit) {
        return ProductCategoryAssignmentEntity.findByCategoryId(categoryId)
                .chain(assignments -> {
                    List<UUID> productIds = assignments.stream()
                            .map(a -> a.productId).toList();
                    if (productIds.isEmpty()) {
                        return Uni.createFrom().item(RestResponse.ok(AuthDtos.ApiResponse.ok(
                                new CatalogDtos.ProductListResponse(List.of(), pageIndex + 1, limit, 0, 0))));
                    }
                    StringBuilder where = new StringBuilder("id in :productIds");
                    Parameters params = new Parameters().and("productIds", productIds);
                    if (extraQuery != null && !extraQuery.isBlank()) {
                        where.append(" and ").append(extraQuery);
                        // merge params
                        extraParams.map().forEach(params::and);
                    }
                    PanacheQuery<ProductEntity> pq = ProductEntity.find(where.toString(), params);
                    return pq.page(Page.of(pageIndex, limit)).list()
                            .chain(products -> pq.count().chain(total -> {
                                int totalPages = (int) Math.ceil((double) total / limit);
                                if (products.isEmpty()) {
                                    return Uni.createFrom().item(RestResponse.ok(AuthDtos.ApiResponse.ok(
                                            new CatalogDtos.ProductListResponse(List.of(), pageIndex + 1, limit, total, totalPages))));
                                }
                                return enrichProductList(products).map(items ->
                                        RestResponse.ok(AuthDtos.ApiResponse.ok(
                                                new CatalogDtos.ProductListResponse(items, pageIndex + 1, limit, total, totalPages))));
                            }));
                });
    }

    /**
     * Batch-enrich a list of products with prices and categories sequentially.
     * Loads all prices, then all categories, then all category entities, and assembles in memory.
     */
    private Uni<List<CatalogDtos.ProductResponse>> enrichProductList(List<ProductEntity> products) {
        List<UUID> productIds = products.stream().map(p -> p.id).toList();
        return ProductPriceEntity.<ProductPriceEntity>list("productId in ?1", productIds)
                .chain(allPrices -> ProductCategoryAssignmentEntity.<ProductCategoryAssignmentEntity>list("productId in ?1", productIds)
                        .chain(allAssignments -> {
                            // Collect all unique category IDs
                            List<UUID> categoryIds = allAssignments.stream()
                                    .map(a -> a.categoryId).distinct().toList();
                            Uni<List<CategoryEntity>> categoriesUni = categoryIds.isEmpty()
                                    ? Uni.createFrom().item(List.<CategoryEntity>of())
                                    : CategoryEntity.<CategoryEntity>list("id in ?1", categoryIds);
                            return categoriesUni.map(allCategories -> {
                                // Build lookup maps
                                Map<UUID, Map<String, BigDecimal>> priceMap = allPrices.stream()
                                        .collect(Collectors.groupingBy(p -> p.productId,
                                                Collectors.toMap(p -> p.currency, p -> p.amount)));
                                Map<UUID, List<UUID>> assignmentMap = allAssignments.stream()
                                        .collect(Collectors.groupingBy(a -> a.productId,
                                                Collectors.mapping(a -> a.categoryId, Collectors.toList())));
                                Map<UUID, CategoryEntity> catEntityMap = allCategories.stream()
                                        .collect(Collectors.toMap(c -> c.id, c -> c));

                                return products.stream().map(product -> {
                                    Map<String, BigDecimal> prices = priceMap.getOrDefault(product.id, Map.of());
                                    List<CatalogDtos.CategorySummary> categories = assignmentMap
                                            .getOrDefault(product.id, List.of()).stream()
                                            .map(catEntityMap::get)
                                            .filter(Objects::nonNull)
                                            .map(cat -> new CatalogDtos.CategorySummary(cat.id, cat.name, cat.slug))
                                            .toList();
                                    return new CatalogDtos.ProductResponse(
                                            product.id, product.title, product.slug, product.description,
                                            product.shortDescription, product.productType, product.status,
                                            product.thumbnailUrl, product.metaTitle, product.metaDescription,
                                            product.sku, product.badge, product.comparePriceCzk, product.comparePriceEur,
                                            product.availability, product.stockLimit, product.weightKg,
                                            product.ogImageUrl, product.variantCategoryName,
                                            prices, categories,
                                            product.createdAt, product.updatedAt);
                                }).toList();
                            });
                        }));
    }

    @GET
    @Path("/{id}")
    @WithSession
    public Uni<RestResponse<AuthDtos.ApiResponse<CatalogDtos.ProductDetailResponse>>> getProduct(
            @PathParam("id") UUID id) {
        return ProductEntity.<ProductEntity>findById(id)
                .onItem().ifNotNull().transformToUni(this::toProductDetailResponse)
                .onItem().ifNotNull().transform(detail -> RestResponse.ok(AuthDtos.ApiResponse.ok(detail)))
                .onItem().ifNull().continueWith(
                        RestResponse.status(RestResponse.Status.NOT_FOUND));
    }

    @POST
    @Path("/draft")
    @Consumes(MediaType.APPLICATION_JSON)
    @WithTransaction
    public Uni<RestResponse<AuthDtos.ApiResponse<CatalogDtos.ProductResponse>>> createDraft(
            CatalogDtos.CreateDraftRequest request) {
        var product = new ProductEntity();
        String randomSuffix = UUID.randomUUID().toString().substring(0, 8);
        product.title = "Draft";
        product.slug = "draft-" + randomSuffix;
        product.productType = request != null && request.productType() != null
                ? request.productType() : "DIGITAL";
        product.status = "DRAFT";
        product.availability = "hidden";
        return product.<ProductEntity>persist()
                .chain(saved -> toProductResponse(saved)
                        .map(resp -> RestResponse.status(RestResponse.Status.CREATED,
                                AuthDtos.ApiResponse.ok(resp))));
    }

    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    @WithTransaction
    public Uni<RestResponse<AuthDtos.ApiResponse<CatalogDtos.ProductResponse>>> createProduct(
            CatalogDtos.CreateProductRequest request) {
        var product = new ProductEntity();
        applyProductFields(product, request);
        return product.<ProductEntity>persist()
                .chain(saved -> syncPrices(saved.id, request.prices())
                        .chain(() -> syncCategories(saved.id, request.categoryIds()))
                        .chain(() -> toProductResponse(saved)))
                .map(resp -> RestResponse.status(RestResponse.Status.CREATED,
                        AuthDtos.ApiResponse.ok(resp)));
    }

    @PUT
    @Path("/{id}")
    @Consumes(MediaType.APPLICATION_JSON)
    @WithTransaction
    public Uni<RestResponse<AuthDtos.ApiResponse<CatalogDtos.ProductResponse>>> updateProduct(
            @PathParam("id") UUID id,
            CatalogDtos.UpdateProductRequest request) {
        return ProductEntity.<ProductEntity>findById(id)
                .onItem().ifNotNull().transformToUni(product -> {
                    applyUpdateFields(product, request);
                    return product.<ProductEntity>persist()
                            .chain(saved -> syncPrices(saved.id, request.prices())
                                    .chain(() -> syncCategories(saved.id, request.categoryIds()))
                                    .chain(() -> toProductResponse(saved)));
                })
                .onItem().ifNotNull().transform(resp -> RestResponse.ok(AuthDtos.ApiResponse.ok(resp)))
                .onItem().ifNull().continueWith(
                        RestResponse.status(RestResponse.Status.NOT_FOUND));
    }

    @DELETE
    @Path("/{id}")
    @WithTransaction
    public Uni<RestResponse<Void>> archiveProduct(@PathParam("id") UUID id) {
        return ProductEntity.<ProductEntity>findById(id)
                .onItem().ifNotNull().transformToUni(product -> {
                    product.status = "ARCHIVED";
                    return product.persist().replaceWith(RestResponse.<Void>ok());
                })
                .onItem().ifNull().continueWith(
                        RestResponse.status(RestResponse.Status.NOT_FOUND));
    }

    @DELETE
    @Path("/bulk")
    @Consumes(MediaType.APPLICATION_JSON)
    @WithTransaction
    public Uni<RestResponse<Void>> bulkDeleteProducts(CatalogDtos.BulkDeleteRequest request) {
        if (request.ids() == null || request.ids().isEmpty()) {
            return Uni.createFrom().item(RestResponse.noContent());
        }
        Uni<Void> chain = Uni.createFrom().voidItem();
        for (UUID pid : request.ids()) {
            chain = chain.chain(() -> ProductEntity.deleteById(pid).replaceWithVoid());
        }
        return chain.map(v -> RestResponse.noContent());
    }

    // ── Product Images (Gallery) ──────────────────────────────

    @GET
    @Path("/{productId}/images")
    @WithSession
    public Uni<RestResponse<AuthDtos.ApiResponse<List<CatalogDtos.GalleryImageResponse>>>> getProductImages(
            @PathParam("productId") UUID productId) {
        return ProductGalleryEntity.findByProductId(productId)
                .chain(galleries -> {
                    if (galleries.isEmpty()) {
                        return Uni.createFrom().item(List.<CatalogDtos.GalleryImageResponse>of());
                    }
                    // Load all images for all gallery entries in one query
                    List<UUID> imageIds = galleries.stream().map(g -> g.imageId).distinct().toList();
                    return ImageEntity.<ImageEntity>list("id in ?1", imageIds)
                            .map(images -> {
                                Map<UUID, ImageEntity> imageMap = images.stream()
                                        .collect(Collectors.toMap(img -> img.id, img -> img));
                                return galleries.stream().map(g -> {
                                    ImageEntity img = imageMap.get(g.imageId);
                                    return new CatalogDtos.GalleryImageResponse(
                                            g.imageId,
                                            img != null ? storageService.getUrl(img.storageKey) : null,
                                            img != null ? img.altText : null,
                                            g.panX, g.panY, g.sortOrder);
                                }).toList();
                            });
                })
                .map(items -> RestResponse.ok(AuthDtos.ApiResponse.ok(items)));
    }

    @POST
    @Path("/{productId}/images")
    @Consumes(MediaType.APPLICATION_JSON)
    @WithTransaction
    public Uni<RestResponse<AuthDtos.ApiResponse<CatalogDtos.GalleryImageResponse>>> addProductImage(
            @PathParam("productId") UUID productId,
            CatalogDtos.AddGalleryImageRequest request) {
        var gallery = new ProductGalleryEntity();
        gallery.productId = productId;
        gallery.imageId = request.imageId();
        gallery.sortOrder = request.sortOrder() != null ? request.sortOrder() : 0;
        gallery.panX = request.panX() != null ? request.panX() : 50;
        gallery.panY = request.panY() != null ? request.panY() : 50;
        return gallery.<ProductGalleryEntity>persist()
                .chain(saved -> ImageEntity.<ImageEntity>findById(saved.imageId)
                        .map(img -> RestResponse.status(RestResponse.Status.CREATED,
                                AuthDtos.ApiResponse.ok(new CatalogDtos.GalleryImageResponse(
                                        saved.imageId,
                                        img != null ? storageService.getUrl(img.storageKey) : null,
                                        img != null ? img.altText : null,
                                        saved.panX, saved.panY, saved.sortOrder)))));
    }

    @DELETE
    @Path("/{productId}/images/{imageId}")
    @WithTransaction
    public Uni<RestResponse<Void>> removeProductImage(
            @PathParam("productId") UUID productId,
            @PathParam("imageId") UUID imageId) {
        return ProductGalleryEntity.deleteByProductIdAndImageId(productId, imageId)
                .map(count -> RestResponse.noContent());
    }

    @PUT
    @Path("/{productId}/images/reorder")
    @Consumes(MediaType.APPLICATION_JSON)
    @WithTransaction
    public Uni<RestResponse<Void>> reorderProductImages(
            @PathParam("productId") UUID productId,
            CatalogDtos.ReorderGalleryRequest request) {
        Uni<Void> chain = Uni.createFrom().voidItem();
        List<UUID> imageIds = request.imageIds();
        for (int i = 0; i < imageIds.size(); i++) {
            final int order = i;
            final UUID imgId = imageIds.get(i);
            chain = chain.chain(() ->
                    ProductGalleryEntity.find("productId = ?1 and imageId = ?2", productId, imgId)
                            .<ProductGalleryEntity>firstResult()
                            .onItem().ifNotNull().transformToUni(g -> {
                                g.sortOrder = order;
                                return g.persist().replaceWithVoid();
                            })
                            .onItem().ifNull().continueWith(() -> null));
        }
        return chain.map(v -> RestResponse.ok());
    }

    // ── Product Variants ──────────────────────────────────────

    @POST
    @Path("/{productId}/variants")
    @Consumes(MediaType.APPLICATION_JSON)
    @WithTransaction
    public Uni<RestResponse<AuthDtos.ApiResponse<CatalogDtos.VariantResponse>>> createVariant(
            @PathParam("productId") UUID productId,
            CatalogDtos.CreateVariantRequest request) {
        var variant = new ProductVariantEntity();
        variant.productId = productId;
        variant.name = request.name();
        variant.sku = request.sku();
        variant.stock = request.stock() != null ? request.stock() : 0;
        variant.sortOrder = request.sortOrder() != null ? request.sortOrder() : 0;
        variant.availability = request.availability() != null ? request.availability() : "hidden";
        variant.weightKg = request.weightKg();
        variant.hidden = request.hidden() != null && request.hidden();
        return variant.<ProductVariantEntity>persist()
                .chain(saved -> syncVariantPrices(saved.id, request.prices())
                        .chain(() -> toVariantResponse(saved)))
                .map(resp -> RestResponse.status(RestResponse.Status.CREATED,
                        AuthDtos.ApiResponse.ok(resp)));
    }

    @PUT
    @Path("/{productId}/variants/{variantId}")
    @Consumes(MediaType.APPLICATION_JSON)
    @WithTransaction
    public Uni<RestResponse<AuthDtos.ApiResponse<CatalogDtos.VariantResponse>>> updateVariant(
            @PathParam("productId") UUID productId,
            @PathParam("variantId") UUID variantId,
            CatalogDtos.CreateVariantRequest request) {
        return ProductVariantEntity.<ProductVariantEntity>findById(variantId)
                .onItem().ifNotNull().transformToUni(variant -> {
                    if (request.name() != null) variant.name = request.name();
                    if (request.sku() != null) variant.sku = request.sku();
                    if (request.stock() != null) variant.stock = request.stock();
                    if (request.sortOrder() != null) variant.sortOrder = request.sortOrder();
                    if (request.availability() != null) variant.availability = request.availability();
                    if (request.weightKg() != null) variant.weightKg = request.weightKg();
                    if (request.hidden() != null) variant.hidden = request.hidden();
                    return variant.<ProductVariantEntity>persist()
                            .chain(saved -> syncVariantPrices(saved.id, request.prices())
                                    .chain(() -> toVariantResponse(saved)));
                })
                .onItem().ifNotNull().transform(resp -> RestResponse.ok(AuthDtos.ApiResponse.ok(resp)))
                .onItem().ifNull().continueWith(
                        RestResponse.status(RestResponse.Status.NOT_FOUND));
    }

    @DELETE
    @Path("/{productId}/variants/{variantId}")
    @WithTransaction
    public Uni<RestResponse<Void>> deleteVariant(
            @PathParam("productId") UUID productId,
            @PathParam("variantId") UUID variantId) {
        return VariantPriceEntity.deleteByVariantId(variantId)
                .chain(() -> ProductVariantEntity.deleteById(variantId))
                .map(deleted -> RestResponse.noContent());
    }

    // ── Product Content ───────────────────────────────────────

    @GET
    @Path("/{productId}/content")
    @WithSession
    public Uni<RestResponse<AuthDtos.ApiResponse<List<CatalogDtos.ContentResponse>>>> getProductContent(
            @PathParam("productId") UUID productId) {
        return ProductContentEntity.findByProductId(productId)
                .map(contents -> contents.stream()
                        .map(ProductAdminResource::toContentResponse)
                        .toList())
                .map(items -> RestResponse.ok(AuthDtos.ApiResponse.ok(items)));
    }

    @PATCH
    @Path("/{productId}/content/{contentId}")
    @Consumes(MediaType.APPLICATION_JSON)
    @WithTransaction
    public Uni<RestResponse<AuthDtos.ApiResponse<CatalogDtos.ContentResponse>>> updateContent(
            @PathParam("productId") UUID productId,
            @PathParam("contentId") UUID contentId,
            CatalogDtos.UpdateContentRequest request) {
        return ProductContentEntity.<ProductContentEntity>findById(contentId)
                .onItem().ifNotNull().transformToUni(content -> {
                    if (request.title() != null) content.title = request.title();
                    if (request.isPreview() != null) content.isPreview = request.isPreview();
                    if (request.durationSeconds() != null) content.durationSeconds = request.durationSeconds();
                    return content.<ProductContentEntity>persist()
                            .map(saved -> RestResponse.ok(
                                    AuthDtos.ApiResponse.ok(toContentResponse(saved))));
                })
                .onItem().ifNull().continueWith(
                        RestResponse.status(RestResponse.Status.NOT_FOUND));
    }

    @DELETE
    @Path("/{productId}/content/{contentId}")
    @WithTransaction
    public Uni<RestResponse<Void>> deleteContent(
            @PathParam("productId") UUID productId,
            @PathParam("contentId") UUID contentId) {
        return ProductContentEntity.deleteById(contentId)
                .map(deleted -> RestResponse.noContent());
    }

    @PUT
    @Path("/{productId}/content/reorder")
    @Consumes(MediaType.APPLICATION_JSON)
    @WithTransaction
    public Uni<RestResponse<Void>> reorderContent(
            @PathParam("productId") UUID productId,
            CatalogDtos.ReorderContentRequest request) {
        Uni<Void> chain = Uni.createFrom().voidItem();
        List<UUID> contentIds = request.contentIds();
        for (int i = 0; i < contentIds.size(); i++) {
            final int order = i;
            final UUID cId = contentIds.get(i);
            chain = chain.chain(() -> ProductContentEntity.<ProductContentEntity>findById(cId)
                    .onItem().ifNotNull().transformToUni(c -> {
                        c.sortOrder = order;
                        return c.persist().replaceWithVoid();
                    })
                    .onItem().ifNull().continueWith(() -> null));
        }
        return chain.map(v -> RestResponse.ok());
    }

    @POST
    @Path("/{productId}/content/stream")
    @Consumes(MediaType.APPLICATION_JSON)
    @WithTransaction
    public Uni<RestResponse<AuthDtos.ApiResponse<CatalogDtos.ContentResponse>>> createStreamContent(
            @PathParam("productId") UUID productId,
            CatalogDtos.CreateStreamContentRequest request) {
        var content = new ProductContentEntity();
        content.productId = productId;
        content.contentType = "VIDEO";
        content.streamUid = request.streamUid();
        content.title = request.title();
        content.durationSeconds = request.durationSeconds();
        content.isPreview = request.isPreview() != null && request.isPreview();
        content.sortOrder = 0;
        return content.<ProductContentEntity>persist()
                .map(saved -> RestResponse.status(RestResponse.Status.CREATED,
                        AuthDtos.ApiResponse.ok(toContentResponse(saved))));
    }

    // ── Helper methods ────────────────────────────────────────

    private Uni<CatalogDtos.ProductResponse> toProductResponse(ProductEntity product) {
        return ProductPriceEntity.findByProductId(product.id)
                .map(prices -> prices.stream()
                        .collect(Collectors.toMap(p -> p.currency, p -> p.amount)))
                .chain(priceMap -> ProductCategoryAssignmentEntity.findByProductId(product.id)
                        .chain(assignments -> {
                            if (assignments.isEmpty()) {
                                return Uni.createFrom().item(List.<CatalogDtos.CategorySummary>of());
                            }
                            List<UUID> catIds = assignments.stream().map(a -> a.categoryId).toList();
                            return CategoryEntity.<CategoryEntity>list("id in ?1", catIds)
                                    .map(cats -> cats.stream()
                                            .map(cat -> new CatalogDtos.CategorySummary(cat.id, cat.name, cat.slug))
                                            .toList());
                        })
                        .map(categories -> new CatalogDtos.ProductResponse(
                                product.id, product.title, product.slug, product.description,
                                product.shortDescription, product.productType, product.status,
                                product.thumbnailUrl, product.metaTitle, product.metaDescription,
                                product.sku, product.badge, product.comparePriceCzk, product.comparePriceEur,
                                product.availability, product.stockLimit, product.weightKg,
                                product.ogImageUrl, product.variantCategoryName,
                                priceMap, categories,
                                product.createdAt, product.updatedAt)));
    }

    private Uni<CatalogDtos.ProductDetailResponse> toProductDetailResponse(ProductEntity product) {
        // Sequential chain: prices -> categories -> images -> variants -> content -> event -> occurrences
        return ProductPriceEntity.findByProductId(product.id)
                .map(prices -> prices.stream()
                        .collect(Collectors.toMap(p -> p.currency, p -> p.amount)))
                .chain(priceMap -> ProductCategoryAssignmentEntity.findByProductId(product.id)
                        .chain(assignments -> {
                            if (assignments.isEmpty()) {
                                return Uni.createFrom().item(List.<CatalogDtos.CategorySummary>of());
                            }
                            List<UUID> catIds = assignments.stream().map(a -> a.categoryId).toList();
                            return CategoryEntity.<CategoryEntity>list("id in ?1", catIds)
                                    .map(cats -> cats.stream()
                                            .map(cat -> new CatalogDtos.CategorySummary(cat.id, cat.name, cat.slug))
                                            .toList());
                        })
                        .chain(categories -> ProductGalleryEntity.findByProductId(product.id)
                                .chain(galleries -> {
                                    if (galleries.isEmpty()) {
                                        return Uni.createFrom().item(List.<CatalogDtos.GalleryImageResponse>of());
                                    }
                                    List<UUID> imageIds = galleries.stream().map(g -> g.imageId).distinct().toList();
                                    return ImageEntity.<ImageEntity>list("id in ?1", imageIds)
                                            .map(images -> {
                                                Map<UUID, ImageEntity> imageMap = images.stream()
                                                        .collect(Collectors.toMap(img -> img.id, img -> img));
                                                return galleries.stream().map(g -> {
                                                    ImageEntity img = imageMap.get(g.imageId);
                                                    return new CatalogDtos.GalleryImageResponse(
                                                            g.imageId,
                                                            img != null ? storageService.getUrl(img.storageKey) : null,
                                                            img != null ? img.altText : null,
                                                            g.panX, g.panY, g.sortOrder);
                                                }).toList();
                                            });
                                })
                                .chain(galleryImages -> ProductVariantEntity.findByProductId(product.id)
                                        .chain(variants -> {
                                            if (variants.isEmpty()) {
                                                return Uni.createFrom().item(List.<CatalogDtos.VariantResponse>of());
                                            }
                                            // Load all variant prices in one batch
                                            List<UUID> variantIds = variants.stream().map(v -> v.id).toList();
                                            return VariantPriceEntity.<VariantPriceEntity>list("variantId in ?1", variantIds)
                                                    .map(allVPrices -> {
                                                        Map<UUID, Map<String, BigDecimal>> vpMap = allVPrices.stream()
                                                                .collect(Collectors.groupingBy(vp -> vp.variantId,
                                                                        Collectors.toMap(vp -> vp.currency, vp -> vp.amount)));
                                                        return variants.stream().map(v -> new CatalogDtos.VariantResponse(
                                                                v.id, v.productId, v.name, v.sku,
                                                                v.stock, v.sortOrder, v.availability,
                                                                v.weightKg, v.hidden,
                                                                vpMap.getOrDefault(v.id, Map.of()),
                                                                v.createdAt, v.updatedAt)).toList();
                                                    });
                                        })
                                        .chain(variantResponses -> ProductContentEntity.findByProductId(product.id)
                                                .map(contents -> contents.stream()
                                                        .map(ProductAdminResource::toContentResponse)
                                                        .toList())
                                                .chain(contentResponses -> EventEntity.findByProductId(product.id)
                                                        .chain(event -> {
                                                            Uni<List<CatalogDtos.OccurrenceResponse>> occurrencesUni = event != null
                                                                    ? EventOccurrenceEntity.findByEventId(event.id)
                                                                    .map(occs -> occs.stream()
                                                                            .map(ProductAdminResource::toOccurrenceResponse)
                                                                            .toList())
                                                                    : Uni.createFrom().item(List.<CatalogDtos.OccurrenceResponse>of());
                                                            return occurrencesUni.map(occurrences -> new CatalogDtos.ProductDetailResponse(
                                                                    product.id, product.title, product.slug, product.description,
                                                                    product.shortDescription, product.productType, product.status,
                                                                    product.thumbnailUrl, product.metaTitle, product.metaDescription,
                                                                    product.sku, product.badge, product.comparePriceCzk, product.comparePriceEur,
                                                                    product.availability, product.stockLimit, product.weightKg,
                                                                    product.ogImageUrl, product.variantCategoryName,
                                                                    priceMap, categories, galleryImages,
                                                                    variantResponses, contentResponses,
                                                                    event != null ? toEventResponse(event) : null,
                                                                    occurrences,
                                                                    product.createdAt, product.updatedAt));
                                                        }))))));
    }

    private Uni<CatalogDtos.VariantResponse> toVariantResponse(ProductVariantEntity variant) {
        return VariantPriceEntity.findByVariantId(variant.id)
                .map(prices -> prices.stream()
                        .collect(Collectors.toMap(p -> p.currency, p -> p.amount)))
                .map(priceMap -> new CatalogDtos.VariantResponse(
                        variant.id, variant.productId, variant.name, variant.sku,
                        variant.stock, variant.sortOrder, variant.availability,
                        variant.weightKg, variant.hidden, priceMap,
                        variant.createdAt, variant.updatedAt));
    }

    private static CatalogDtos.ContentResponse toContentResponse(ProductContentEntity content) {
        return new CatalogDtos.ContentResponse(
                content.id, content.productId, content.contentType, content.title,
                content.isPreview, content.storageKey, content.originalFilename,
                content.mimeType, content.fileSizeBytes, content.streamUid,
                content.durationSeconds, content.sortOrder,
                content.createdAt, content.updatedAt);
    }

    private static CatalogDtos.EventResponse toEventResponse(EventEntity event) {
        return new CatalogDtos.EventResponse(
                event.id, event.productId, event.venue, event.capacity,
                event.isOnline, event.streamUrl, event.recordingProductId,
                event.createdAt, event.updatedAt);
    }

    private static CatalogDtos.OccurrenceResponse toOccurrenceResponse(EventOccurrenceEntity occ) {
        return new CatalogDtos.OccurrenceResponse(
                occ.id, occ.eventId, occ.startsAt, occ.endsAt,
                occ.status, occ.streamUrl, occ.createdAt, occ.updatedAt);
    }

    private Uni<Void> syncPrices(UUID productId, Map<String, BigDecimal> prices) {
        return ProductPriceEntity.deleteByProductId(productId)
                .chain(() -> {
                    if (prices == null || prices.isEmpty()) {
                        return Uni.createFrom().voidItem();
                    }
                    Uni<Void> chain = Uni.createFrom().voidItem();
                    for (var entry : prices.entrySet()) {
                        chain = chain.chain(() -> {
                            var price = new ProductPriceEntity();
                            price.productId = productId;
                            price.currency = entry.getKey();
                            price.amount = entry.getValue();
                            return price.persist().replaceWithVoid();
                        });
                    }
                    return chain;
                });
    }

    private Uni<Void> syncCategories(UUID productId, List<UUID> categoryIds) {
        return ProductCategoryAssignmentEntity.deleteByProductId(productId)
                .chain(() -> {
                    if (categoryIds == null || categoryIds.isEmpty()) {
                        return Uni.createFrom().voidItem();
                    }
                    Uni<Void> chain = Uni.createFrom().voidItem();
                    for (UUID catId : categoryIds) {
                        chain = chain.chain(() -> {
                            var assignment = new ProductCategoryAssignmentEntity();
                            assignment.productId = productId;
                            assignment.categoryId = catId;
                            return assignment.persist().replaceWithVoid();
                        });
                    }
                    return chain;
                });
    }

    private Uni<Void> syncVariantPrices(UUID variantId, Map<String, BigDecimal> prices) {
        return VariantPriceEntity.deleteByVariantId(variantId)
                .chain(() -> {
                    if (prices == null || prices.isEmpty()) {
                        return Uni.createFrom().voidItem();
                    }
                    Uni<Void> chain = Uni.createFrom().voidItem();
                    for (var entry : prices.entrySet()) {
                        chain = chain.chain(() -> {
                            var price = new VariantPriceEntity();
                            price.variantId = variantId;
                            price.currency = entry.getKey();
                            price.amount = entry.getValue();
                            return price.persist().replaceWithVoid();
                        });
                    }
                    return chain;
                });
    }

    private void applyProductFields(ProductEntity product, CatalogDtos.CreateProductRequest request) {
        product.title = request.title();
        product.slug = request.slug();
        product.description = request.description();
        product.shortDescription = request.shortDescription();
        product.productType = request.productType() != null ? request.productType() : "DIGITAL";
        product.status = request.status() != null ? request.status() : "DRAFT";
        product.thumbnailUrl = request.thumbnailUrl();
        product.metaTitle = request.metaTitle();
        product.metaDescription = request.metaDescription();
        product.sku = request.sku();
        product.badge = request.badge();
        product.comparePriceCzk = request.comparePriceCzk();
        product.comparePriceEur = request.comparePriceEur();
        product.availability = request.availability() != null ? request.availability() : "hidden";
        product.stockLimit = request.stockLimit();
        product.weightKg = request.weightKg();
        product.ogImageUrl = request.ogImageUrl();
        product.variantCategoryName = request.variantCategoryName();
    }

    private void applyUpdateFields(ProductEntity product, CatalogDtos.UpdateProductRequest request) {
        if (request.title() != null) product.title = request.title();
        if (request.slug() != null) product.slug = request.slug();
        if (request.description() != null) product.description = request.description();
        if (request.shortDescription() != null) product.shortDescription = request.shortDescription();
        if (request.productType() != null) product.productType = request.productType();
        if (request.status() != null) product.status = request.status();
        if (request.thumbnailUrl() != null) product.thumbnailUrl = request.thumbnailUrl();
        if (request.metaTitle() != null) product.metaTitle = request.metaTitle();
        if (request.metaDescription() != null) product.metaDescription = request.metaDescription();
        if (request.sku() != null) product.sku = request.sku();
        if (request.badge() != null) product.badge = request.badge();
        if (request.comparePriceCzk() != null) product.comparePriceCzk = request.comparePriceCzk();
        if (request.comparePriceEur() != null) product.comparePriceEur = request.comparePriceEur();
        if (request.availability() != null) product.availability = request.availability();
        if (request.stockLimit() != null) product.stockLimit = request.stockLimit();
        if (request.weightKg() != null) product.weightKg = request.weightKg();
        if (request.ogImageUrl() != null) product.ogImageUrl = request.ogImageUrl();
        if (request.variantCategoryName() != null) product.variantCategoryName = request.variantCategoryName();
    }
}
