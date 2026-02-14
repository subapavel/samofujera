package cz.samofujera.catalog;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

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
}
