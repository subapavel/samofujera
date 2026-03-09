package cz.samofujera.domain;

import com.fasterxml.jackson.annotation.JsonRawValue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.Instant;
import java.util.UUID;

public final class PageDtos {
    private PageDtos() {}

    public record PageResponse(
            UUID id,
            String slug,
            String title,
            String status,
            String pageType,
            String metaTitle,
            String metaDescription,
            UUID ogImageId,
            int sortOrder,
            boolean showInNav,
            Instant createdAt,
            Instant updatedAt,
            Instant publishedAt,
            Instant scheduledPublishAt,
            UUID productId
    ) {}

    public record PageDetailResponse(
            UUID id,
            String slug,
            String title,
            String status,
            String pageType,
            @JsonRawValue String content,
            String metaTitle,
            String metaDescription,
            String metaKeywords,
            String ogTitle,
            String ogDescription,
            UUID ogImageId,
            boolean noindex,
            boolean nofollow,
            int sortOrder,
            boolean showInNav,
            Instant createdAt,
            Instant updatedAt,
            Instant publishedAt,
            Instant scheduledPublishAt,
            UUID publishedRevisionId,
            UUID productId
    ) {}

    public record PublicPageResponse(
            UUID id,
            String slug,
            String title,
            @JsonRawValue String content,
            String metaTitle,
            String metaDescription,
            String metaKeywords,
            String ogTitle,
            String ogDescription,
            String ogImageUrl,
            boolean noindex,
            boolean nofollow
    ) {}

    public record CreatePageRequest(
            @NotBlank String slug,
            @NotBlank String title,
            String pageType,
            UUID productId
    ) {}

    public record UpdatePageRequest(
            String slug,
            String title,
            Object content,
            String metaTitle,
            String metaDescription,
            UUID ogImageId,
            Boolean showInNav,
            String metaKeywords,
            String ogTitle,
            String ogDescription,
            Boolean noindex,
            Boolean nofollow
    ) {}

    public record SchedulePublishRequest(
            @NotNull Instant scheduledPublishAt
    ) {}

    public record RevisionResponse(
            UUID id,
            int version,
            String title,
            String slug,
            Long createdBy,
            Instant createdAt
    ) {}
}
