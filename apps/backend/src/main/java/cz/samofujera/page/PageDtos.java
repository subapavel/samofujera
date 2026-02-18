package cz.samofujera.page;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public final class PageDtos {
    private PageDtos() {}

    public record PageResponse(
        UUID id, String slug, String title, String status, String pageType,
        String metaTitle, String metaDescription, UUID ogImageId,
        int sortOrder, boolean showInNav,
        OffsetDateTime createdAt, OffsetDateTime updatedAt, OffsetDateTime publishedAt
    ) {}

    public record PageDetailResponse(
        UUID id, String slug, String title, String status, String pageType,
        Object content, String metaTitle, String metaDescription, UUID ogImageId,
        int sortOrder, boolean showInNav,
        OffsetDateTime createdAt, OffsetDateTime updatedAt, OffsetDateTime publishedAt
    ) {}

    public record PageListResponse(
        List<PageResponse> items,
        int page, int limit, int totalItems, int totalPages
    ) {}

    public record CreatePageRequest(
        @NotBlank @Size(max = 255) String slug,
        @NotBlank @Size(max = 500) String title,
        String pageType
    ) {}

    public record UpdatePageRequest(
        @NotBlank @Size(max = 255) String slug,
        @NotBlank @Size(max = 500) String title,
        Object content,
        @Size(max = 200) String metaTitle,
        @Size(max = 500) String metaDescription,
        UUID ogImageId
    ) {}

    public record PublicPageResponse(
        String slug, String title, Object content,
        String metaTitle, String metaDescription
    ) {}
}
