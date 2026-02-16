package cz.samofujera.media;

import jakarta.validation.constraints.Size;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public final class MediaDtos {
    private MediaDtos() {}

    public record MediaItemResponse(UUID id, String originalFilename,
        String originalUrl, String thumbUrl, String mediumUrl, String largeUrl, String ogUrl,
        String mimeType, long fileSizeBytes, Integer width, Integer height,
        String altText, OffsetDateTime createdAt) {}

    public record MediaItemListResponse(List<MediaItemResponse> items, int page, int limit, long totalItems, int totalPages) {}

    public record UpdateMediaItemRequest(@Size(max = 500) String altText) {}
}
