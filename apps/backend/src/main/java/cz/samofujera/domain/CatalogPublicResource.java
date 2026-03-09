package cz.samofujera.domain;

import cz.samofujera.auth.AuthDtos;
import cz.samofujera.domain.entity.*;
import io.quarkus.hibernate.reactive.panache.PanacheQuery;
import io.quarkus.hibernate.reactive.panache.common.WithSession;
import io.quarkus.panache.common.Page;
import io.quarkus.panache.common.Parameters;
import io.quarkus.panache.common.Sort;
import io.smallrye.mutiny.Uni;
import jakarta.annotation.security.PermitAll;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import org.jboss.resteasy.reactive.RestResponse;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

@Path("/api/catalog")
@ApplicationScoped
@PermitAll
@Produces(MediaType.APPLICATION_JSON)
public class CatalogPublicResource {

    @jakarta.inject.Inject
    LocalStorageService storageService;

    @GET
    @Path("/categories")
    @WithSession
    public Uni<RestResponse<AuthDtos.ApiResponse<List<CatalogDtos.CategoryResponse>>>> getCategories() {
        return CategoryEntity.findAll(Sort.by("sortOrder"))
                .<CategoryEntity>list()
                .map(categories -> categories.stream()
                        .map(cat -> new CatalogDtos.CategoryResponse(
                                cat.id, cat.name, cat.slug, cat.description,
                                cat.sortOrder, cat.createdAt, cat.updatedAt))
                        .toList())
                .map(items -> RestResponse.ok(AuthDtos.ApiResponse.ok(items)));
    }

    @GET
    @Path("/products")
    @WithSession
    public Uni<RestResponse<AuthDtos.ApiResponse<CatalogDtos.ProductListResponse>>> getProducts(
            @QueryParam("page") @DefaultValue("1") int page,
            @QueryParam("limit") @DefaultValue("20") int limit,
            @QueryParam("category") String categorySlug,
            @QueryParam("type") String productType,
            @QueryParam("search") String search) {

        List<String> conditions = new ArrayList<>();
        Parameters params = new Parameters();

        // Public catalog only shows ACTIVE products
        conditions.add("status = :status");
        params.and("status", "ACTIVE");

        if (productType != null && !productType.isBlank()) {
            conditions.add("productType = :productType");
            params.and("productType", productType);
        }
        if (search != null && !search.isBlank()) {
            conditions.add("(lower(title) like :search or lower(slug) like :search)");
            params.and("search", "%" + search.toLowerCase() + "%");
        }

        String query = String.join(" and ", conditions);
        int pageIndex = Math.max(0, page - 1);

        // If filtering by category slug, resolve category first
        if (categorySlug != null && !categorySlug.isBlank()) {
            return CategoryEntity.findBySlug(categorySlug)
                    .chain(cat -> {
                        if (cat == null) {
                            return Uni.createFrom().item(RestResponse.ok(AuthDtos.ApiResponse.ok(
                                    new CatalogDtos.ProductListResponse(List.of(), page, limit, 0, 0))));
                        }
                        return filterByCategoryPublic(cat.id, query, params, pageIndex, limit, page);
                    });
        }

        PanacheQuery<ProductEntity> pq = ProductEntity.find(query, params);
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

    @GET
    @Path("/products/{slug}")
    @WithSession
    public Uni<RestResponse<AuthDtos.ApiResponse<CatalogDtos.ProductDetailResponse>>> getProductBySlug(
            @PathParam("slug") String slug,
            @QueryParam("preview") @DefaultValue("false") boolean preview) {
        return ProductEntity.findBySlug(slug)
                .chain(product -> {
                    if (product == null) {
                        return Uni.createFrom().item(
                                RestResponse.<AuthDtos.ApiResponse<CatalogDtos.ProductDetailResponse>>status(
                                        RestResponse.Status.NOT_FOUND));
                    }
                    // Only ACTIVE products visible publicly, unless preview=true (admin preview)
                    if (!"ACTIVE".equals(product.status) && !preview) {
                        return Uni.createFrom().item(
                                RestResponse.<AuthDtos.ApiResponse<CatalogDtos.ProductDetailResponse>>status(
                                        RestResponse.Status.NOT_FOUND));
                    }
                    return toPublicDetailResponse(product)
                            .map(detail -> RestResponse.ok(AuthDtos.ApiResponse.ok(detail)));
                });
    }

    // ── Helpers ───────────────────────────────────────────────

    private Uni<RestResponse<AuthDtos.ApiResponse<CatalogDtos.ProductListResponse>>> filterByCategoryPublic(
            UUID categoryId, String query, Parameters params, int pageIndex, int limit, int page) {
        return ProductCategoryAssignmentEntity.findByCategoryId(categoryId)
                .chain(assignments -> {
                    List<UUID> productIds = assignments.stream().map(a -> a.productId).toList();
                    if (productIds.isEmpty()) {
                        return Uni.createFrom().item(RestResponse.ok(AuthDtos.ApiResponse.ok(
                                new CatalogDtos.ProductListResponse(List.of(), page, limit, 0, 0))));
                    }
                    String fullQuery = "id in :productIds and " + query;
                    Parameters fullParams = new Parameters().and("productIds", productIds);
                    params.map().forEach(fullParams::and);

                    PanacheQuery<ProductEntity> pq = ProductEntity.find(fullQuery, fullParams);
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
                });
    }

    /**
     * Batch-enrich a list of products with prices and categories sequentially.
     */
    private Uni<List<CatalogDtos.ProductResponse>> enrichProductList(List<ProductEntity> products) {
        List<UUID> productIds = products.stream().map(p -> p.id).toList();
        return ProductPriceEntity.<ProductPriceEntity>list("productId in ?1", productIds)
                .chain(allPrices -> ProductCategoryAssignmentEntity.<ProductCategoryAssignmentEntity>list("productId in ?1", productIds)
                        .chain(allAssignments -> {
                            List<UUID> categoryIds = allAssignments.stream()
                                    .map(a -> a.categoryId).distinct().toList();
                            Uni<List<CategoryEntity>> categoriesUni = categoryIds.isEmpty()
                                    ? Uni.createFrom().item(List.<CategoryEntity>of())
                                    : CategoryEntity.<CategoryEntity>list("id in ?1", categoryIds);
                            return categoriesUni.map(allCategories -> {
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

    private Uni<CatalogDtos.ProductDetailResponse> toPublicDetailResponse(ProductEntity product) {
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
                                                        .filter(c -> c.isPreview)
                                                        .map(c -> new CatalogDtos.ContentResponse(
                                                                c.id, c.productId, c.contentType, c.title,
                                                                c.isPreview, null, c.originalFilename,
                                                                c.mimeType, c.fileSizeBytes, c.streamUid,
                                                                c.durationSeconds, c.sortOrder,
                                                                c.createdAt, c.updatedAt))
                                                        .toList())
                                                .chain(contentResponses -> EventEntity.findByProductId(product.id)
                                                        .chain(event -> {
                                                            Uni<List<CatalogDtos.OccurrenceResponse>> occurrencesUni = event != null
                                                                    ? EventOccurrenceEntity.findByEventId(event.id)
                                                                    .map(occs -> occs.stream()
                                                                            .map(occ -> new CatalogDtos.OccurrenceResponse(
                                                                                    occ.id, occ.eventId, occ.startsAt, occ.endsAt,
                                                                                    occ.status, null, occ.createdAt, occ.updatedAt))
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
                                                                    event != null ? new CatalogDtos.EventResponse(
                                                                            event.id, event.productId, event.venue, event.capacity,
                                                                            event.isOnline, null, null,
                                                                            event.createdAt, event.updatedAt) : null,
                                                                    occurrences,
                                                                    product.createdAt, product.updatedAt));
                                                        }))))));
    }
}