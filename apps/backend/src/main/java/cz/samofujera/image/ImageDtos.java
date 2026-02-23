package cz.samofujera.image;

import jakarta.validation.constraints.Size;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public final class ImageDtos {
    private ImageDtos() {}

    public record ImageResponse(
        UUID id, String url, String originalFilename, String mimeType,
        long fileSizeBytes, Integer width, Integer height,
        String title, String altText, OffsetDateTime createdAt,
        List<UsageInfo> usedIn
    ) {}

    public record UsageInfo(String entityType, UUID entityId, String entityName) {}

    public record ImageListResponse(
        List<ImageResponse> items, int page, int limit, long totalItems, int totalPages
    ) {}

    public record UpdateImageRequest(
        @Size(max = 500) String title,
        @Size(max = 500) String altText
    ) {}
}
