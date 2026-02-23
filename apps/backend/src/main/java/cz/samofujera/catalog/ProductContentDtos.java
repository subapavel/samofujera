package cz.samofujera.catalog;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public final class ProductContentDtos {
    private ProductContentDtos() {}

    public record ContentResponse(
        UUID id, UUID productId, String contentType, String title,
        boolean isPreview, String originalFilename, String mimeType,
        Long fileSizeBytes, String streamUid, Integer durationSeconds,
        int sortOrder, OffsetDateTime createdAt
    ) {}

    public record CreateStreamContentRequest(
        @NotBlank String title,
        @NotBlank String contentType,
        String streamUid,
        Integer durationSeconds
    ) {}

    public record UpdateContentRequest(
        String title,
        Boolean isPreview
    ) {}

    public record ReorderContentRequest(
        @NotNull List<UUID> contentIds
    ) {}
}
