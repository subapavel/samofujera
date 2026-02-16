package cz.samofujera.catalog;

import cz.samofujera.catalog.internal.*;
import cz.samofujera.media.MediaService;
import cz.samofujera.shared.exception.NotFoundException;
import cz.samofujera.shared.storage.StorageService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.InputStream;
import java.math.BigDecimal;
import java.time.Duration;
import java.util.*;

@Service
public class CatalogService {

    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;
    private final ProductPriceRepository productPriceRepository;
    private final ProductVariantRepository productVariantRepository;
    private final VariantPriceRepository variantPriceRepository;
    private final ProductFileRepository productFileRepository;
    private final ProductMediaRepository productMediaRepository;
    private final ProductGalleryRepository galleryRepository;
    private final EventRepository eventRepository;
    private final EventOccurrenceRepository eventOccurrenceRepository;
    private final StorageService storageService;
    private final ProductCategoryAssignmentRepository assignmentRepository;
    private final MediaService mediaService;

    CatalogService(CategoryRepository categoryRepository, ProductRepository productRepository,
                   ProductPriceRepository productPriceRepository,
                   ProductVariantRepository productVariantRepository,
                   VariantPriceRepository variantPriceRepository,
                   ProductFileRepository productFileRepository,
                   ProductMediaRepository productMediaRepository,
                   ProductGalleryRepository galleryRepository,
                   EventRepository eventRepository,
                   EventOccurrenceRepository eventOccurrenceRepository,
                   StorageService storageService,
                   ProductCategoryAssignmentRepository assignmentRepository,
                   MediaService mediaService) {
        this.categoryRepository = categoryRepository;
        this.productRepository = productRepository;
        this.productPriceRepository = productPriceRepository;
        this.productVariantRepository = productVariantRepository;
        this.variantPriceRepository = variantPriceRepository;
        this.productFileRepository = productFileRepository;
        this.productMediaRepository = productMediaRepository;
        this.galleryRepository = galleryRepository;
        this.eventRepository = eventRepository;
        this.eventOccurrenceRepository = eventOccurrenceRepository;
        this.storageService = storageService;
        this.assignmentRepository = assignmentRepository;
        this.mediaService = mediaService;
    }

    // --- Category methods ---

    public List<CatalogDtos.CategoryResponse> getCategories() {
        return categoryRepository.findAll().stream()
            .map(this::toCategoryResponse)
            .toList();
    }

    public CatalogDtos.CategoryResponse getCategoryById(UUID id) {
        var row = categoryRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Category not found"));
        return toCategoryResponse(row);
    }

    @Transactional
    public void reorderCategories(List<UUID> categoryIds) {
        categoryRepository.updateSortOrders(categoryIds);
    }

    private CatalogDtos.CategoryResponse toCategoryResponse(CategoryRepository.CategoryRow row) {
        String imageUrl = null;
        if (row.imageMediaId() != null) {
            try {
                imageUrl = mediaService.getUrl(row.imageMediaId());
            } catch (Exception ignored) {}
        }
        return new CatalogDtos.CategoryResponse(
            row.id(), row.name(), row.slug(), row.description(),
            row.imageMediaId(), imageUrl,
            row.metaTitle(), row.metaDescription(), row.sortOrder()
        );
    }

    @Transactional
    public CatalogDtos.CategoryResponse createCategory(CatalogDtos.CreateCategoryRequest request) {
        if (categoryRepository.existsBySlug(request.slug())) {
            throw new IllegalArgumentException("Category with slug '" + request.slug() + "' already exists");
        }
        var sortOrder = categoryRepository.findNextSortOrder();
        var id = categoryRepository.create(
            request.name(), request.slug(), request.description(), request.imageMediaId(),
            request.metaTitle(), request.metaDescription(), sortOrder
        );
        var created = categoryRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Category not found"));
        return toCategoryResponse(created);
    }

    @Transactional
    public CatalogDtos.CategoryResponse updateCategory(UUID id, CatalogDtos.UpdateCategoryRequest request) {
        categoryRepository.findById(id).orElseThrow(() -> new NotFoundException("Category not found"));
        var existingBySlug = categoryRepository.findBySlug(request.slug());
        if (existingBySlug.isPresent() && !existingBySlug.get().id().equals(id)) {
            throw new IllegalArgumentException("Category with slug '" + request.slug() + "' already exists");
        }
        categoryRepository.update(
            id, request.name(), request.slug(), request.description(), request.imageMediaId(),
            request.metaTitle(), request.metaDescription()
        );
        var updated = categoryRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Category not found"));
        return toCategoryResponse(updated);
    }

    @Transactional
    public void deleteCategory(UUID id) {
        categoryRepository.findById(id).orElseThrow(() -> new NotFoundException("Category not found"));
        categoryRepository.delete(id);
    }

    // --- Product methods ---

    public CatalogDtos.ProductResponse getProductById(UUID id) {
        var product = productRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Product not found"));
        var prices = productPriceRepository.findByProductId(id);
        var categories = assignmentRepository.findCategoriesForProduct(id).stream()
            .map(c -> new CatalogDtos.CategorySummary(c.id(), c.name(), c.slug()))
            .toList();
        return toProductResponse(product, prices, categories);
    }

    public CatalogDtos.ProductListResponse getProducts(String status, String categorySlug,
            String productType, String search, int page, int limit) {
        List<UUID> productIdsInCategory = null;
        if (categorySlug != null && !categorySlug.isBlank()) {
            productIdsInCategory = assignmentRepository.findProductIdsByCategorySlug(categorySlug);
            if (productIdsInCategory.isEmpty()) {
                return new CatalogDtos.ProductListResponse(List.of(), page, limit, 0, 0);
            }
        }

        int offset = Math.max(0, (page - 1) * limit);
        var items = productRepository.findAll(status, productIdsInCategory, productType, search, offset, limit);
        long totalItems = productRepository.count(status, productIdsInCategory, productType, search);
        int totalPages = (int) Math.ceil((double) totalItems / limit);

        var productIds = items.stream().map(ProductRepository.ProductRow::id).toList();
        var pricesMap = productPriceRepository.findByProductIds(productIds);
        var categoriesMap = assignmentRepository.findCategoriesForProducts(productIds);

        var responses = items.stream()
            .map(p -> {
                var cats = categoriesMap.getOrDefault(p.id(), List.of()).stream()
                    .map(c -> new CatalogDtos.CategorySummary(c.id(), c.name(), c.slug()))
                    .toList();
                return toProductResponse(p, pricesMap.getOrDefault(p.id(), Map.of()), cats);
            })
            .toList();
        return new CatalogDtos.ProductListResponse(responses, page, limit, totalItems, totalPages);
    }

    public CatalogDtos.ProductDetailResponse getProductBySlug(String slug) {
        var product = productRepository.findBySlug(slug)
            .orElseThrow(() -> new NotFoundException("Product not found"));
        return buildDetailResponse(product);
    }

    public CatalogDtos.ProductDetailResponse getProductDetailById(UUID id) {
        var product = productRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Product not found"));
        return buildDetailResponse(product);
    }

    @Transactional
    public CatalogDtos.ProductDetailResponse createDraft(CatalogDtos.CreateDraftRequest request) {
        var slug = "draft-" + UUID.randomUUID().toString().substring(0, 8);
        var id = productRepository.create(
            "Nový produkt", slug, null, null,
            request.productType(), null, null, null
        );
        var product = productRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Product not found"));
        return buildDetailResponse(product);
    }

    @Transactional
    public CatalogDtos.ProductResponse createProduct(CatalogDtos.CreateProductRequest request) {
        if (productRepository.existsBySlug(request.slug())) {
            throw new IllegalArgumentException("Product with slug '" + request.slug() + "' already exists");
        }

        var id = productRepository.create(
            request.title(), request.slug(), request.description(), request.shortDescription(),
            request.productType(), request.thumbnailUrl(), request.metaTitle(), request.metaDescription()
        );

        // Assign categories
        assignCategoriesIfPresent(id, request.categoryIds());

        // Save prices
        if (request.prices() != null) {
            request.prices().forEach((currency, amount) ->
                productPriceRepository.upsert(id, currency, amount));
        }

        // Save type-specific data
        saveTypeSpecificData(id, request.productType(), request.variants(), request.event(), request.occurrences());

        var created = productRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Product not found"));
        var prices = productPriceRepository.findByProductId(id);
        var categories = assignmentRepository.findCategoriesForProduct(id).stream()
            .map(c -> new CatalogDtos.CategorySummary(c.id(), c.name(), c.slug()))
            .toList();
        return toProductResponse(created, prices, categories);
    }

    @Transactional
    public CatalogDtos.ProductResponse updateProduct(UUID id, CatalogDtos.UpdateProductRequest request) {
        productRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Product not found"));

        productRepository.update(
            id, request.title(), request.slug(), request.description(), request.shortDescription(),
            request.productType(), request.status(), request.thumbnailUrl(),
            request.metaTitle(), request.metaDescription()
        );

        // Sync category assignments
        assignCategoriesIfPresent(id, request.categoryIds());

        // Sync prices: delete all and re-insert
        productPriceRepository.deleteByProductId(id);
        if (request.prices() != null) {
            request.prices().forEach((currency, amount) ->
                productPriceRepository.upsert(id, currency, amount));
        }

        // Sync type-specific data
        syncTypeSpecificData(id, request.productType(), request.variants(), request.event(), request.occurrences());

        var updated = productRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Product not found"));
        var prices = productPriceRepository.findByProductId(id);
        var categories = assignmentRepository.findCategoriesForProduct(id).stream()
            .map(c -> new CatalogDtos.CategorySummary(c.id(), c.name(), c.slug()))
            .toList();
        return toProductResponse(updated, prices, categories);
    }

    @Transactional
    public void archiveProduct(UUID id) {
        productRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Product not found"));
        productRepository.updateStatus(id, "ARCHIVED");
    }

    // --- Price lookup (used by order module) ---

    public BigDecimal getProductPrice(UUID productId, String currency) {
        return productPriceRepository.findByProductIdAndCurrency(productId, currency);
    }

    public BigDecimal getVariantPrice(UUID variantId, String currency) {
        return variantPriceRepository.findByVariantIdAndCurrency(variantId, currency);
    }

    // --- File methods (EBOOK) ---

    public CatalogDtos.FileDetailResponse getFileById(UUID fileId) {
        var file = productFileRepository.findById(fileId)
            .orElseThrow(() -> new NotFoundException("File not found"));
        return new CatalogDtos.FileDetailResponse(
            file.id(), file.productId(), file.fileKey(), file.fileName(),
            file.fileSizeBytes(), file.mimeType(), file.sortOrder()
        );
    }

    public String generateFileDownloadUrl(UUID fileId, Duration ttl) {
        var file = productFileRepository.findById(fileId)
            .orElseThrow(() -> new NotFoundException("File not found"));
        return storageService.generatePresignedUrl(file.fileKey(), ttl);
    }

    @Transactional
    public CatalogDtos.FileResponse uploadFile(UUID productId, String fileName, String mimeType,
                                                 long fileSize, InputStream inputStream) {
        productRepository.findById(productId)
            .orElseThrow(() -> new NotFoundException("Product not found"));

        var fileKey = "products/" + productId + "/" + UUID.randomUUID() + "/" + fileName;
        var sortOrder = productFileRepository.countByProductId(productId);

        storageService.upload(fileKey, inputStream, fileSize, mimeType);

        var fileId = productFileRepository.create(productId, fileKey, fileName, fileSize, mimeType, sortOrder);
        var created = productFileRepository.findById(fileId)
            .orElseThrow(() -> new NotFoundException("File not found"));

        return toFileResponse(created);
    }

    @Transactional
    public void deleteFile(UUID productId, UUID fileId) {
        var file = productFileRepository.findById(fileId)
            .orElseThrow(() -> new NotFoundException("File not found"));
        if (!file.productId().equals(productId)) {
            throw new IllegalArgumentException("File does not belong to product");
        }
        storageService.delete(file.fileKey());
        productFileRepository.delete(fileId);
    }

    public List<CatalogDtos.FileResponse> getFilesForProduct(UUID productId) {
        return productFileRepository.findByProductId(productId).stream()
            .map(this::toFileResponse)
            .toList();
    }

    // --- Media methods (AUDIO_VIDEO) ---

    @Transactional
    public CatalogDtos.MediaResponse createMedia(UUID productId, CatalogDtos.CreateMediaRequest request) {
        productRepository.findById(productId)
            .orElseThrow(() -> new NotFoundException("Product not found"));

        var mediaId = productMediaRepository.create(
            productId, request.title(), request.mediaType(),
            request.cfStreamUid(), request.fileKey(),
            request.durationSeconds(), request.sortOrder()
        );
        var created = productMediaRepository.findById(mediaId)
            .orElseThrow(() -> new NotFoundException("Media not found"));
        return toMediaResponse(created);
    }

    @Transactional
    public void deleteMedia(UUID productId, UUID mediaId) {
        var media = productMediaRepository.findById(mediaId)
            .orElseThrow(() -> new NotFoundException("Media not found"));
        if (!media.productId().equals(productId)) {
            throw new IllegalArgumentException("Media does not belong to product");
        }
        productMediaRepository.delete(mediaId);
    }

    public List<CatalogDtos.MediaResponse> getMediaForProduct(UUID productId) {
        return productMediaRepository.findByProductId(productId).stream()
            .map(this::toMediaResponse)
            .toList();
    }

    // --- Event methods ---

    public CatalogDtos.EventResponse getEventForProduct(UUID productId) {
        var event = eventRepository.findByProductId(productId)
            .orElseThrow(() -> new NotFoundException("Event not found"));
        return toEventResponse(event);
    }

    public List<CatalogDtos.OccurrenceResponse> getOccurrencesForProduct(UUID productId) {
        var event = eventRepository.findByProductId(productId).orElse(null);
        if (event == null) return List.of();
        return eventOccurrenceRepository.findByEventId(event.id()).stream()
            .map(this::toOccurrenceResponse)
            .toList();
    }

    // --- Variant methods ---

    public List<CatalogDtos.VariantResponse> getVariantsForProduct(UUID productId) {
        var variants = productVariantRepository.findByProductId(productId);
        var variantIds = variants.stream().map(ProductVariantRepository.VariantRow::id).toList();
        var variantPrices = variantPriceRepository.findByVariantIds(variantIds);

        return variants.stream()
            .map(v -> new CatalogDtos.VariantResponse(
                v.id(), v.name(), v.sku(), v.stock(), v.sortOrder(),
                variantPrices.getOrDefault(v.id(), Map.of())
            ))
            .toList();
    }

    public CatalogDtos.VariantResponse getVariantById(UUID variantId) {
        var row = productVariantRepository.findById(variantId)
            .orElseThrow(() -> new NotFoundException("Variant not found"));
        var prices = variantPriceRepository.findByVariantIds(List.of(variantId));
        return new CatalogDtos.VariantResponse(
            row.id(), row.name(), row.sku(), row.stock(), row.sortOrder(),
            prices.getOrDefault(variantId, Map.of())
        );
    }

    public void decrementVariantStock(UUID variantId, int quantity) {
        productVariantRepository.decrementStock(variantId, quantity);
    }

    // --- Variant CRUD methods ---

    @Transactional
    public CatalogDtos.VariantResponse createVariant(UUID productId, CatalogDtos.CreateVariantRequest request) {
        productRepository.findById(productId)
            .orElseThrow(() -> new NotFoundException("Product not found"));

        var variantId = productVariantRepository.create(
            productId, request.name(), request.sku(), request.stock(), request.sortOrder());
        if (request.prices() != null) {
            request.prices().forEach((currency, amount) ->
                variantPriceRepository.upsert(variantId, currency, amount));
        }

        return getVariantById(variantId);
    }

    @Transactional
    public CatalogDtos.VariantResponse updateVariant(UUID productId, UUID variantId,
                                                      CatalogDtos.CreateVariantRequest request) {
        var variant = productVariantRepository.findById(variantId)
            .orElseThrow(() -> new NotFoundException("Variant not found"));
        if (!variant.productId().equals(productId)) {
            throw new IllegalArgumentException("Variant does not belong to product");
        }

        productVariantRepository.update(variantId, request.name(), request.sku(), request.stock(), request.sortOrder());

        variantPriceRepository.deleteByVariantId(variantId);
        if (request.prices() != null) {
            request.prices().forEach((currency, amount) ->
                variantPriceRepository.upsert(variantId, currency, amount));
        }

        return getVariantById(variantId);
    }

    @Transactional
    public void deleteVariant(UUID productId, UUID variantId) {
        var variant = productVariantRepository.findById(variantId)
            .orElseThrow(() -> new NotFoundException("Variant not found"));
        if (!variant.productId().equals(productId)) {
            throw new IllegalArgumentException("Variant does not belong to product");
        }
        variantPriceRepository.deleteByVariantId(variantId);
        productVariantRepository.deleteById(variantId);
    }

    // --- Product gallery methods ---

    @Transactional
    public void addImageToProduct(UUID productId, UUID mediaItemId) {
        int count = galleryRepository.countByProductId(productId);
        galleryRepository.add(productId, mediaItemId, count);
    }

    @Transactional
    public void removeImageFromProduct(UUID productId, UUID mediaItemId) {
        galleryRepository.remove(productId, mediaItemId);
    }

    @Transactional
    public void reorderProductImages(UUID productId, List<UUID> mediaItemIds) {
        galleryRepository.reorder(productId, mediaItemIds);
    }

    public List<CatalogDtos.ImageResponse> getImagesForProduct(UUID productId) {
        var entries = galleryRepository.findByProductId(productId);
        return entries.stream().map(entry -> {
            var mediaItem = mediaService.getById(entry.mediaItemId());
            return new CatalogDtos.ImageResponse(
                mediaItem.id(), mediaItem.originalUrl(), mediaItem.thumbUrl(),
                mediaItem.mediumUrl(), mediaItem.largeUrl(), mediaItem.ogUrl(),
                mediaItem.altText(), entry.sortOrder());
        }).toList();
    }

    // --- Private helpers ---

    private void assignCategoriesIfPresent(UUID productId, List<UUID> categoryIds) {
        if (categoryIds == null || categoryIds.isEmpty()) {
            assignmentRepository.removeAllForProduct(productId);
            return;
        }
        for (var catId : categoryIds) {
            if (!categoryRepository.existsById(catId)) {
                throw new NotFoundException("Category not found: " + catId);
            }
        }
        assignmentRepository.assignCategories(productId, categoryIds);
    }

    private void saveTypeSpecificData(UUID productId, String productType,
                                       List<CatalogDtos.CreateVariantRequest> variants,
                                       CatalogDtos.CreateEventRequest event,
                                       List<CatalogDtos.CreateOccurrenceRequest> occurrences) {
        if ("PHYSICAL".equals(productType) && variants != null) {
            for (var v : variants) {
                var variantId = productVariantRepository.create(productId, v.name(), v.sku(), v.stock(), v.sortOrder());
                if (v.prices() != null) {
                    v.prices().forEach((currency, amount) ->
                        variantPriceRepository.upsert(variantId, currency, amount));
                }
            }
        }

        if (isEventType(productType) && event != null) {
            var eventId = eventRepository.create(
                productId, event.venue(), event.capacity(),
                event.isOnline(), event.streamUrl(), event.recordingProductId()
            );
            if (occurrences != null) {
                for (var o : occurrences) {
                    eventOccurrenceRepository.create(eventId, o.startsAt(), o.endsAt(), o.streamUrl());
                }
            }
        }
    }

    private void syncTypeSpecificData(UUID productId, String productType,
                                       List<CatalogDtos.CreateVariantRequest> variants,
                                       CatalogDtos.CreateEventRequest event,
                                       List<CatalogDtos.CreateOccurrenceRequest> occurrences) {
        // Sync variants (delete + recreate)
        if ("PHYSICAL".equals(productType) && variants != null) {
            productVariantRepository.deleteByProductId(productId);
            for (var v : variants) {
                var variantId = productVariantRepository.create(productId, v.name(), v.sku(), v.stock(), v.sortOrder());
                if (v.prices() != null) {
                    v.prices().forEach((currency, amount) ->
                        variantPriceRepository.upsert(variantId, currency, amount));
                }
            }
        }

        // Sync event + occurrences
        if (isEventType(productType) && event != null) {
            var existing = eventRepository.findByProductId(productId);
            if (existing.isPresent()) {
                eventOccurrenceRepository.deleteByEventId(existing.get().id());
                eventRepository.update(
                    existing.get().id(), event.venue(), event.capacity(),
                    event.isOnline(), event.streamUrl(), event.recordingProductId()
                );
                if (occurrences != null) {
                    for (var o : occurrences) {
                        eventOccurrenceRepository.create(existing.get().id(), o.startsAt(), o.endsAt(), o.streamUrl());
                    }
                }
            } else {
                var eventId = eventRepository.create(
                    productId, event.venue(), event.capacity(),
                    event.isOnline(), event.streamUrl(), event.recordingProductId()
                );
                if (occurrences != null) {
                    for (var o : occurrences) {
                        eventOccurrenceRepository.create(eventId, o.startsAt(), o.endsAt(), o.streamUrl());
                    }
                }
            }
        }
    }

    private boolean isEventType(String productType) {
        return "ONLINE_EVENT".equals(productType)
            || "RECURRING_EVENT".equals(productType)
            || "OFFLINE_EVENT".equals(productType);
    }

    private CatalogDtos.ProductDetailResponse buildDetailResponse(ProductRepository.ProductRow product) {
        var prices = productPriceRepository.findByProductId(product.id());
        var categories = assignmentRepository.findCategoriesForProduct(product.id()).stream()
            .map(c -> new CatalogDtos.CategorySummary(c.id(), c.name(), c.slug()))
            .toList();
        var images = getImagesForProduct(product.id());
        var variants = "PHYSICAL".equals(product.productType()) ? getVariantsForProduct(product.id()) : null;
        var files = "EBOOK".equals(product.productType()) ? getFilesForProduct(product.id()) : null;
        var media = "AUDIO_VIDEO".equals(product.productType()) ? getMediaForProduct(product.id()) : null;

        CatalogDtos.EventResponse eventResp = null;
        List<CatalogDtos.OccurrenceResponse> occurrenceResps = null;
        if (isEventType(product.productType())) {
            var eventOpt = eventRepository.findByProductId(product.id());
            if (eventOpt.isPresent()) {
                eventResp = toEventResponse(eventOpt.get());
                occurrenceResps = eventOccurrenceRepository.findByEventId(eventOpt.get().id()).stream()
                    .map(this::toOccurrenceResponse)
                    .toList();
            }
        }

        return new CatalogDtos.ProductDetailResponse(
            product.id(), product.title(), product.slug(), product.description(),
            product.shortDescription(), product.productType(), prices,
            product.status(), product.thumbnailUrl(),
            product.metaTitle(), product.metaDescription(), categories,
            images, variants, files, media, eventResp, occurrenceResps,
            product.createdAt(), product.updatedAt()
        );
    }

    private CatalogDtos.ProductResponse toProductResponse(ProductRepository.ProductRow row,
                                                            Map<String, BigDecimal> prices,
                                                            List<CatalogDtos.CategorySummary> categories) {
        return new CatalogDtos.ProductResponse(
            row.id(), row.title(), row.slug(), row.description(), row.shortDescription(),
            row.productType(), prices, row.status(), row.thumbnailUrl(),
            row.metaTitle(), row.metaDescription(), categories,
            row.createdAt(), row.updatedAt()
        );
    }

    private CatalogDtos.FileResponse toFileResponse(ProductFileRepository.FileRow row) {
        return new CatalogDtos.FileResponse(
            row.id(), row.fileName(), row.fileSizeBytes(), row.mimeType(), row.sortOrder()
        );
    }

    private CatalogDtos.MediaResponse toMediaResponse(ProductMediaRepository.MediaRow row) {
        return new CatalogDtos.MediaResponse(
            row.id(), row.title(), row.mediaType(), row.cfStreamUid(),
            row.durationSeconds(), row.sortOrder()
        );
    }

    private CatalogDtos.EventResponse toEventResponse(EventRepository.EventRow row) {
        return new CatalogDtos.EventResponse(
            row.id(), row.venue(), row.capacity(), row.isOnline(),
            row.streamUrl(), row.recordingProductId()
        );
    }

    private CatalogDtos.OccurrenceResponse toOccurrenceResponse(EventOccurrenceRepository.OccurrenceRow row) {
        return new CatalogDtos.OccurrenceResponse(
            row.id(), row.startsAt(), row.endsAt(), row.status(), row.streamUrl()
        );
    }
}
