package cz.samofujera.catalog;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public final class CatalogDtos {
    private CatalogDtos() {}

    public record CategoryResponse(
        UUID id,
        String name,
        String slug,
        UUID parentId,
        int sortOrder,
        List<CategoryResponse> children
    ) {}

    public record CreateCategoryRequest(
        @NotBlank @Size(max = 255) String name,
        @NotBlank @Size(max = 255) String slug,
        UUID parentId,
        int sortOrder
    ) {}

    public record UpdateCategoryRequest(
        @NotBlank @Size(max = 255) String name,
        @NotBlank @Size(max = 255) String slug,
        UUID parentId,
        int sortOrder
    ) {}

    // Product DTOs

    public record ProductResponse(
        UUID id, String title, String slug, String description, String shortDescription,
        String productType, BigDecimal priceAmount, String priceCurrency,
        String status, String thumbnailUrl, UUID categoryId, String categoryName,
        OffsetDateTime createdAt, OffsetDateTime updatedAt
    ) {}

    public record ProductListResponse(
        List<ProductResponse> items, int page, int limit, long totalItems, int totalPages
    ) {}

    public record CreateProductRequest(
        @NotBlank @Size(max = 255) String title,
        @NotBlank @Size(max = 255) String slug,
        String description,
        @Size(max = 500) String shortDescription,
        @NotBlank String productType,
        @NotNull @DecimalMin("0.01") BigDecimal priceAmount,
        String priceCurrency,
        String thumbnailUrl,
        UUID categoryId
    ) {}

    public record UpdateProductRequest(
        @NotBlank @Size(max = 255) String title,
        @NotBlank @Size(max = 255) String slug,
        String description,
        @Size(max = 500) String shortDescription,
        @NotBlank String productType,
        @NotNull @DecimalMin("0.01") BigDecimal priceAmount,
        String priceCurrency,
        String status,
        String thumbnailUrl,
        UUID categoryId
    ) {}

    public record ProductDetailResponse(
        UUID id, String title, String slug, String description, String shortDescription,
        String productType, BigDecimal priceAmount, String priceCurrency,
        String status, String thumbnailUrl, UUID categoryId, String categoryName,
        List<AssetResponse> assets, OffsetDateTime createdAt, OffsetDateTime updatedAt
    ) {}

    public record AssetResponse(
        UUID id, String assetType, String fileName, long fileSizeBytes,
        String mimeType, Integer durationSeconds, int sortOrder
    ) {}
}
