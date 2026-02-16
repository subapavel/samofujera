package cz.samofujera.media;

import cz.samofujera.media.internal.MediaFolderRepository;
import cz.samofujera.media.internal.MediaItemRepository;
import cz.samofujera.shared.exception.NotFoundException;
import cz.samofujera.shared.storage.StorageService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.io.InputStream;
import java.time.Duration;
import java.util.List;
import java.util.UUID;

@Service
public class MediaService {

    private final MediaFolderRepository folderRepository;
    private final MediaItemRepository itemRepository;
    private final StorageService storageService;

    MediaService(MediaFolderRepository folderRepository, MediaItemRepository itemRepository,
                 StorageService storageService) {
        this.folderRepository = folderRepository;
        this.itemRepository = itemRepository;
        this.storageService = storageService;
    }

    // --- Folder methods ---

    public List<MediaDtos.FolderResponse> getFolders() {
        return folderRepository.findAll().stream()
            .map(this::toFolderResponse)
            .toList();
    }

    @Transactional
    public MediaDtos.FolderResponse createFolder(MediaDtos.CreateFolderRequest request) {
        var id = folderRepository.create(request.name(), request.slug(), request.parentFolderId());
        var created = folderRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Folder not found"));
        return toFolderResponse(created);
    }

    @Transactional
    public MediaDtos.FolderResponse renameFolder(UUID id, MediaDtos.RenameFolderRequest request) {
        folderRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Folder not found"));
        folderRepository.rename(id, request.name(), request.slug());
        var updated = folderRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Folder not found"));
        return toFolderResponse(updated);
    }

    @Transactional
    public void deleteFolder(UUID id) {
        folderRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Folder not found"));
        if (folderRepository.hasChildren(id)) {
            throw new IllegalArgumentException("Cannot delete folder with child folders");
        }
        if (folderRepository.hasItems(id)) {
            throw new IllegalArgumentException("Cannot delete folder with media items");
        }
        folderRepository.delete(id);
    }

    // --- Upload methods ---

    public MediaDtos.TempUploadResponse uploadTemp(InputStream inputStream, String filename,
                                                    String contentType, long size) {
        var ext = extractExtension(filename);
        var tempKey = "temp/" + UUID.randomUUID() + ext;
        storageService.upload(tempKey, inputStream, size, contentType);
        var previewUrl = storageService.generatePresignedUrl(tempKey, Duration.ofHours(1));
        return new MediaDtos.TempUploadResponse(tempKey, previewUrl);
    }

    @Transactional
    public MediaDtos.MediaItemResponse createFromTemp(MediaDtos.CreateMediaItemRequest request) {
        var newId = UUID.randomUUID();
        var ext = extractExtension(request.originalFilename());
        var newKey = "media/" + newId + ext;

        storageService.copy(request.tempKey(), newKey);
        storageService.delete(request.tempKey());

        var id = itemRepository.create(
            request.folderId(), request.originalFilename(), newKey,
            request.mimeType(), request.fileSizeBytes(),
            request.width(), request.height(), request.altText()
        );

        var created = itemRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Media item not found"));
        var url = storageService.generatePresignedUrl(created.storageKey(), Duration.ofHours(1));
        return toMediaItemResponse(created, url);
    }

    @Transactional
    public MediaDtos.MediaItemResponse uploadAndCreate(InputStream inputStream, String filename,
                                                        String contentType, long size,
                                                        UUID folderId, String altText) {
        var newId = UUID.randomUUID();
        var ext = extractExtension(filename);
        var newKey = "media/" + newId + ext;

        storageService.upload(newKey, inputStream, size, contentType);

        var id = itemRepository.create(folderId, filename, newKey, contentType, size, null, null, altText);

        var created = itemRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Media item not found"));
        var url = storageService.generatePresignedUrl(created.storageKey(), Duration.ofHours(1));
        return toMediaItemResponse(created, url);
    }

    // --- Item methods ---

    public MediaDtos.MediaItemListResponse getItems(UUID folderId, String type, String search,
                                                     int page, int limit) {
        int offset = Math.max(0, (page - 1) * limit);
        String mimeTypePrefix = type != null && !type.isBlank() ? type + "/" : null;

        var items = itemRepository.findAll(folderId, mimeTypePrefix, search, offset, limit);
        long totalItems = itemRepository.count(folderId, mimeTypePrefix, search);
        int totalPages = (int) Math.ceil((double) totalItems / limit);

        var responses = items.stream()
            .map(item -> {
                var url = storageService.generatePresignedUrl(item.storageKey(), Duration.ofHours(1));
                return toMediaItemResponse(item, url);
            })
            .toList();

        return new MediaDtos.MediaItemListResponse(responses, page, limit, totalItems, totalPages);
    }

    public MediaDtos.MediaItemResponse getById(UUID id) {
        var item = itemRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Media item not found"));
        var url = storageService.generatePresignedUrl(item.storageKey(), Duration.ofHours(1));
        return toMediaItemResponse(item, url);
    }

    public String getUrl(UUID id) {
        var item = itemRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Media item not found"));
        return storageService.generatePresignedUrl(item.storageKey(), Duration.ofHours(1));
    }

    @Transactional
    public MediaDtos.MediaItemResponse updateItem(UUID id, MediaDtos.UpdateMediaItemRequest request) {
        itemRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Media item not found"));
        itemRepository.update(id, request.altText(), request.folderId());
        var updated = itemRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Media item not found"));
        var url = storageService.generatePresignedUrl(updated.storageKey(), Duration.ofHours(1));
        return toMediaItemResponse(updated, url);
    }

    @Transactional
    public void deleteItem(UUID id) {
        var item = itemRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Media item not found"));
        storageService.delete(item.storageKey());
        itemRepository.delete(id);
    }

    // --- Private helpers ---

    private String extractExtension(String filename) {
        if (filename == null) return "";
        int lastDot = filename.lastIndexOf('.');
        return lastDot >= 0 ? filename.substring(lastDot) : "";
    }

    private MediaDtos.FolderResponse toFolderResponse(MediaFolderRepository.FolderRow row) {
        return new MediaDtos.FolderResponse(
            row.id(), row.name(), row.slug(), row.parentFolderId(), row.createdAt()
        );
    }

    private MediaDtos.MediaItemResponse toMediaItemResponse(MediaItemRepository.MediaItemRow row, String url) {
        return new MediaDtos.MediaItemResponse(
            row.id(), row.originalFilename(), url, row.mimeType(),
            row.fileSizeBytes(), row.width(), row.height(),
            row.altText(), row.folderId(), row.createdAt()
        );
    }
}
