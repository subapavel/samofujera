package cz.samofujera.media;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public final class MediaDtos {
    private MediaDtos() {}

    public record MediaItemResponse(UUID id, String originalFilename, String url,
        String mimeType, long fileSizeBytes, Integer width, Integer height,
        String altText, UUID folderId, OffsetDateTime createdAt) {}

    public record TempUploadResponse(String tempKey, String previewUrl) {}

    public record FolderResponse(UUID id, String name, String slug, UUID parentFolderId, OffsetDateTime createdAt) {}

    public record MediaItemListResponse(List<MediaItemResponse> items, int page, int limit, long totalItems, int totalPages) {}

    public record CreateFolderRequest(
        @NotBlank @Size(max = 255) String name,
        @NotBlank @Size(max = 255) String slug,
        UUID parentFolderId) {}

    public record RenameFolderRequest(
        @NotBlank @Size(max = 255) String name,
        @NotBlank @Size(max = 255) String slug) {}

    public record CreateMediaItemRequest(
        @NotBlank String tempKey,
        @NotBlank String originalFilename,
        @NotBlank String mimeType,
        long fileSizeBytes,
        UUID folderId,
        Integer width,
        Integer height,
        @Size(max = 500) String altText) {}

    public record UpdateMediaItemRequest(
        @Size(max = 500) String altText,
        UUID folderId) {}
}
