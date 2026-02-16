package cz.samofujera.catalog;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public final class CatalogDtos {
    private CatalogDtos() {}

    // Category DTOs

    public record CategoryResponse(
        UUID id, String name, String slug, String description,
        UUID imageMediaId, String imageUrl,
        String metaTitle, String metaDescription, int sortOrder
    ) {}

    public record CreateCategoryRequest(
        @NotBlank @Size(max = 255) String name,
        @NotBlank @Size(max = 255) String slug,
        String description, UUID imageMediaId,
        @Size(max = 255) String metaTitle,
        @Size(max = 500) String metaDescription
    ) {}

    public record UpdateCategoryRequest(
        @NotBlank @Size(max = 255) String name,
        @NotBlank @Size(max = 255) String slug,
        String description, UUID imageMediaId,
        @Size(max = 255) String metaTitle,
        @Size(max = 500) String metaDescription
    ) {}

    public record ReorderCategoriesRequest(
        @NotNull List<UUID> categoryIds
    ) {}

    public record CategorySummary(UUID id, String name, String slug) {}

    // Product DTOs

    public record ProductResponse(
        UUID id, String title, String slug, String description, String shortDescription,
        String productType, Map<String, BigDecimal> prices,
        String status, String thumbnailUrl,
        String metaTitle, String metaDescription, List<CategorySummary> categories,
        OffsetDateTime createdAt, OffsetDateTime updatedAt
    ) {}

    public record ProductListResponse(
        List<ProductResponse> items, int page, int limit, long totalItems, int totalPages
    ) {}

    public record ProductDetailResponse(
        UUID id, String title, String slug, String description, String shortDescription,
        String productType, Map<String, BigDecimal> prices,
        String status, String thumbnailUrl,
        String metaTitle, String metaDescription, List<CategorySummary> categories,
        List<ImageResponse> images,
        List<VariantResponse> variants,
        List<FileResponse> files,
        List<MediaResponse> media,
        EventResponse event,
        List<OccurrenceResponse> occurrences,
        OffsetDateTime createdAt, OffsetDateTime updatedAt
    ) {}

    public record CreateProductRequest(
        @NotBlank @Size(max = 255) String title,
        @NotBlank @Size(max = 255) String slug,
        String description,
        @Size(max = 500) String shortDescription,
        @NotBlank String productType,
        @NotNull Map<String, @DecimalMin("0.01") BigDecimal> prices,
        String thumbnailUrl,
        List<UUID> categoryIds,
        @Size(max = 255) String metaTitle,
        @Size(max = 500) String metaDescription,
        @Valid List<CreateVariantRequest> variants,
        @Valid CreateEventRequest event,
        @Valid List<CreateOccurrenceRequest> occurrences
    ) {}

    public record UpdateProductRequest(
        @NotBlank @Size(max = 255) String title,
        @NotBlank @Size(max = 255) String slug,
        String description,
        @Size(max = 500) String shortDescription,
        @NotBlank String productType,
        @NotNull Map<String, @DecimalMin("0.01") BigDecimal> prices,
        String status,
        String thumbnailUrl,
        List<UUID> categoryIds,
        @Size(max = 255) String metaTitle,
        @Size(max = 500) String metaDescription,
        @Valid List<CreateVariantRequest> variants,
        @Valid CreateEventRequest event,
        @Valid List<CreateOccurrenceRequest> occurrences
    ) {}

    // Variant DTOs

    public record VariantResponse(
        UUID id, String name, String sku, int stock, int sortOrder,
        Map<String, BigDecimal> prices
    ) {}

    public record CreateVariantRequest(
        @NotBlank @Size(max = 255) String name,
        @NotBlank @Size(max = 100) String sku,
        int stock,
        int sortOrder,
        @NotNull Map<String, @DecimalMin("0.01") BigDecimal> prices
    ) {}

    // Image DTOs

    public record ImageResponse(
        UUID id, String fileName, String url, String altText, int sortOrder
    ) {}

    public record ReorderImagesRequest(
        @NotNull List<UUID> imageIds
    ) {}

    public record UpdateImageAltTextRequest(
        String altText
    ) {}

    // File DTOs (EBOOK)

    public record FileResponse(
        UUID id, String fileName, long fileSizeBytes, String mimeType, int sortOrder
    ) {}

    public record FileDetailResponse(
        UUID id, UUID productId, String fileKey, String fileName,
        long fileSizeBytes, String mimeType, int sortOrder
    ) {}

    // Media DTOs (AUDIO_VIDEO)

    public record MediaResponse(
        UUID id, String title, String mediaType, String cfStreamUid,
        Integer durationSeconds, int sortOrder
    ) {}

    public record CreateMediaRequest(
        @NotBlank @Size(max = 255) String title,
        @NotBlank String mediaType,
        String cfStreamUid,
        String fileKey,
        Integer durationSeconds,
        int sortOrder
    ) {}

    // Event DTOs

    public record EventResponse(
        UUID id, String venue, Integer capacity, boolean isOnline,
        String streamUrl, UUID recordingProductId
    ) {}

    public record CreateEventRequest(
        String venue,
        Integer capacity,
        boolean isOnline,
        String streamUrl,
        UUID recordingProductId
    ) {}

    // Occurrence DTOs

    public record OccurrenceResponse(
        UUID id, OffsetDateTime startsAt, OffsetDateTime endsAt,
        String status, String streamUrl
    ) {}

    public record CreateOccurrenceRequest(
        @NotNull OffsetDateTime startsAt,
        @NotNull OffsetDateTime endsAt,
        String streamUrl
    ) {}
}
