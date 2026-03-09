package cz.samofujera.domain;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * DTOs for catalog admin and public endpoints.
 */
public final class CatalogDtos {
    private CatalogDtos() {}

    // ── Category ──────────────────────────────────────────────

    public record CategoryResponse(
            UUID id,
            String name,
            String slug,
            String description,
            int sortOrder,
            Instant createdAt,
            Instant updatedAt
    ) {}

    public record CreateCategoryRequest(
            String name,
            String slug,
            String description,
            Integer sortOrder
    ) {}

    public record UpdateCategoryRequest(
            String name,
            String slug,
            String description,
            Integer sortOrder
    ) {}

    public record ReorderCategoriesRequest(
            List<UUID> categoryIds
    ) {}

    // ── Category Summary (for product associations) ───────────

    public record CategorySummary(
            UUID id,
            String name,
            String slug
    ) {}

    // ── Product ───────────────────────────────────────────────

    public record ProductResponse(
            UUID id,
            String title,
            String slug,
            String description,
            String shortDescription,
            String productType,
            String status,
            String thumbnailUrl,
            String metaTitle,
            String metaDescription,
            String sku,
            String badge,
            BigDecimal comparePriceCzk,
            BigDecimal comparePriceEur,
            String availability,
            Integer stockLimit,
            BigDecimal weightKg,
            String ogImageUrl,
            String variantCategoryName,
            Map<String, BigDecimal> prices,
            List<CategorySummary> categories,
            Instant createdAt,
            Instant updatedAt
    ) {}

    public record ProductDetailResponse(
            UUID id,
            String title,
            String slug,
            String description,
            String shortDescription,
            String productType,
            String status,
            String thumbnailUrl,
            String metaTitle,
            String metaDescription,
            String sku,
            String badge,
            BigDecimal comparePriceCzk,
            BigDecimal comparePriceEur,
            String availability,
            Integer stockLimit,
            BigDecimal weightKg,
            String ogImageUrl,
            String variantCategoryName,
            Map<String, BigDecimal> prices,
            List<CategorySummary> categories,
            List<GalleryImageResponse> images,
            List<VariantResponse> variants,
            List<ContentResponse> content,
            EventResponse event,
            List<OccurrenceResponse> occurrences,
            Instant createdAt,
            Instant updatedAt
    ) {}

    public record ProductListResponse(
            List<ProductResponse> items,
            int page,
            int limit,
            long totalItems,
            int totalPages
    ) {}

    public record CreateDraftRequest(
            String productType
    ) {}

    public record CreateProductRequest(
            String title,
            String slug,
            String description,
            String shortDescription,
            String productType,
            String status,
            String thumbnailUrl,
            String metaTitle,
            String metaDescription,
            String sku,
            String badge,
            BigDecimal comparePriceCzk,
            BigDecimal comparePriceEur,
            String availability,
            Integer stockLimit,
            BigDecimal weightKg,
            String ogImageUrl,
            String variantCategoryName,
            Map<String, BigDecimal> prices,
            List<UUID> categoryIds
    ) {}

    public record UpdateProductRequest(
            String title,
            String slug,
            String description,
            String shortDescription,
            String productType,
            String status,
            String thumbnailUrl,
            String metaTitle,
            String metaDescription,
            String sku,
            String badge,
            BigDecimal comparePriceCzk,
            BigDecimal comparePriceEur,
            String availability,
            Integer stockLimit,
            BigDecimal weightKg,
            String ogImageUrl,
            String variantCategoryName,
            Map<String, BigDecimal> prices,
            List<UUID> categoryIds
    ) {}

    public record BulkDeleteRequest(
            List<UUID> ids
    ) {}

    // ── Variant ───────────────────────────────────────────────

    public record VariantResponse(
            UUID id,
            UUID productId,
            String name,
            String sku,
            int stock,
            int sortOrder,
            String availability,
            BigDecimal weightKg,
            boolean hidden,
            Map<String, BigDecimal> prices,
            Instant createdAt,
            Instant updatedAt
    ) {}

    public record CreateVariantRequest(
            String name,
            String sku,
            Integer stock,
            Integer sortOrder,
            String availability,
            BigDecimal weightKg,
            Boolean hidden,
            Map<String, BigDecimal> prices
    ) {}

    // ── Gallery Image ─────────────────────────────────────────

    public record GalleryImageResponse(
            UUID imageId,
            String url,
            String altText,
            int panX,
            int panY,
            int sortOrder
    ) {}

    public record AddGalleryImageRequest(
            UUID imageId,
            Integer sortOrder,
            Integer panX,
            Integer panY
    ) {}

    public record ReorderGalleryRequest(
            List<UUID> imageIds
    ) {}

    // ── Image (library) ───────────────────────────────────────

    public record ImageDetailResponse(
            UUID id,
            String url,
            String originalFilename,
            String mimeType,
            long fileSizeBytes,
            Integer width,
            Integer height,
            String title,
            String altText,
            Instant createdAt,
            List<Object> usedIn
    ) {}

    public record ImageListResponse(
            List<ImageDetailResponse> items,
            int page,
            int limit,
            long totalItems,
            int totalPages
    ) {}

    public record UpdateImageRequest(
            String altText,
            String title
    ) {}

    // ── Content ───────────────────────────────────────────────

    public record ContentResponse(
            UUID id,
            UUID productId,
            String contentType,
            String title,
            boolean isPreview,
            String storageKey,
            String originalFilename,
            String mimeType,
            Long fileSizeBytes,
            String streamUid,
            Integer durationSeconds,
            int sortOrder,
            Instant createdAt,
            Instant updatedAt
    ) {}

    public record CreateStreamContentRequest(
            String streamUid,
            String title,
            Integer durationSeconds,
            Boolean isPreview
    ) {}

    public record UpdateContentRequest(
            String title,
            Boolean isPreview,
            Integer durationSeconds
    ) {}

    public record ReorderContentRequest(
            List<UUID> contentIds
    ) {}

    // ── Event ─────────────────────────────────────────────────

    public record EventResponse(
            UUID id,
            UUID productId,
            String venue,
            Integer capacity,
            boolean isOnline,
            String streamUrl,
            UUID recordingProductId,
            Instant createdAt,
            Instant updatedAt
    ) {}

    public record OccurrenceResponse(
            UUID id,
            UUID eventId,
            Instant startsAt,
            Instant endsAt,
            String status,
            String streamUrl,
            Instant createdAt,
            Instant updatedAt
    ) {}
}
