package cz.samofujera.page;

import com.fasterxml.jackson.annotation.JsonRawValue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public final class PageDtos {
    private PageDtos() {}

    public record PageResponse(
        UUID id, String slug, String title, String status, String pageType,
        String metaTitle, String metaDescription, UUID ogImageId,
        int sortOrder, boolean showInNav,
        OffsetDateTime createdAt, OffsetDateTime updatedAt, OffsetDateTime publishedAt,
        OffsetDateTime scheduledPublishAt
    ) {}

    public record PageDetailResponse(
        UUID id, String slug, String title, String status, String pageType,
        @JsonRawValue String content, String metaTitle, String metaDescription, UUID ogImageId,
        String metaKeywords, String ogTitle, String ogDescription,
        boolean noindex, boolean nofollow,
        int sortOrder, boolean showInNav,
        OffsetDateTime createdAt, OffsetDateTime updatedAt, OffsetDateTime publishedAt,
        OffsetDateTime scheduledPublishAt
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

    // Content comes as raw JSON from frontend — use Object so Jackson deserializes it as a Map/tree
    public record UpdatePageRequest(
        @NotBlank @Size(max = 255) String slug,
        @NotBlank @Size(max = 500) String title,
        Object content,
        @Size(max = 200) String metaTitle,
        @Size(max = 500) String metaDescription,
        UUID ogImageId,
        boolean showInNav,
        @Size(max = 300) String metaKeywords,
        @Size(max = 200) String ogTitle,
        @Size(max = 500) String ogDescription,
        boolean noindex,
        boolean nofollow
    ) {}

    public record SchedulePublishRequest(@NotNull Instant scheduledPublishAt) {}

    public record PublicPageResponse(
        String slug, String title, @JsonRawValue String content,
        String metaTitle, String metaDescription,
        String metaKeywords, String ogTitle, String ogDescription,
        String ogImageUrl, boolean noindex, boolean nofollow
    ) {}
}
