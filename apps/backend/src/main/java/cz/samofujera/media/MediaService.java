package cz.samofujera.media;

import cz.samofujera.media.internal.MediaItemRepository;
import cz.samofujera.shared.exception.NotFoundException;
import cz.samofujera.shared.storage.StorageService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.imageio.ImageIO;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.time.Duration;
import java.util.UUID;

@Service
public class MediaService {

    private final MediaItemRepository itemRepository;
    private final StorageService storageService;

    MediaService(MediaItemRepository itemRepository, StorageService storageService) {
        this.itemRepository = itemRepository;
        this.storageService = storageService;
    }

    // --- Upload methods ---

    @Transactional
    public MediaDtos.MediaItemResponse uploadAndCreate(InputStream inputStream, String filename,
                                                        String contentType, long size,
                                                        String altText) throws IOException {
        var newId = UUID.randomUUID();
        var ext = extractExtension(filename);
        var prefix = "media/" + newId + "/";
        var originalKey = prefix + "original" + ext;

        var originalData = inputStream.readAllBytes();

        storageService.upload(originalKey, originalData, contentType);

        // Read original image dimensions
        Integer width = null;
        Integer height = null;
        if (contentType != null && contentType.startsWith("image/")) {
            var image = ImageIO.read(new ByteArrayInputStream(originalData));
            if (image != null) {
                width = image.getWidth();
                height = image.getHeight();
            }
        }

        var id = itemRepository.create(filename, originalKey, contentType, size, width, height, altText);

        var created = itemRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Media item not found"));
        return toMediaItemResponse(created);
    }

    @Transactional
    public MediaDtos.MediaItemResponse uploadPublicAndCreate(InputStream inputStream, String filename,
                                                              String contentType, long size,
                                                              String altText) throws IOException {
        var newId = UUID.randomUUID();
        var ext = extractExtension(filename);
        var prefix = "public/media/" + newId + "/";
        var originalKey = prefix + "original" + ext;

        var originalData = inputStream.readAllBytes();

        storageService.upload(originalKey, originalData, contentType);

        Integer width = null;
        Integer height = null;
        if (contentType != null && contentType.startsWith("image/")) {
            var image = ImageIO.read(new ByteArrayInputStream(originalData));
            if (image != null) {
                width = image.getWidth();
                height = image.getHeight();
            }
        }

        var id = itemRepository.create(filename, originalKey, contentType, size, width, height, altText);

        var created = itemRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Media item not found"));
        return toMediaItemResponse(created);
    }

    // --- Item methods ---

    public String getUrl(UUID id) {
        var item = itemRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Media item not found"));
        var storageKey = item.storageKey();
        if (storageKey.startsWith("public/")) {
            return storageService.getPublicUrl(storageKey);
        }
        return storageService.generatePresignedUrl(storageKey, Duration.ofHours(1));
    }

    public MediaDtos.MediaItemListResponse getItems(String source, String type, String search,
                                                     int page, int limit) {
        int offset = Math.max(0, (page - 1) * limit);
        String mimeTypePrefix = type != null && !type.isBlank() ? type.toLowerCase() + "/" : null;

        var items = itemRepository.findAll(source, mimeTypePrefix, search, offset, limit);
        long totalItems = itemRepository.count(source, mimeTypePrefix, search);
        int totalPages = (int) Math.ceil((double) totalItems / limit);

        var responses = items.stream()
            .map(this::toMediaItemResponse)
            .toList();

        return new MediaDtos.MediaItemListResponse(responses, page, limit, totalItems, totalPages);
    }

    public MediaDtos.MediaItemResponse getById(UUID id) {
        var item = itemRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Media item not found"));
        return toMediaItemResponse(item);
    }

    @Transactional
    public MediaDtos.MediaItemResponse updateItem(UUID id, MediaDtos.UpdateMediaItemRequest request) {
        itemRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Media item not found"));
        itemRepository.update(id, request.altText());
        var updated = itemRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Media item not found"));
        return toMediaItemResponse(updated);
    }

    @Transactional
    public void deleteItem(UUID id) {
        var item = itemRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Media item not found"));
        var prefix = item.storageKey().substring(0, item.storageKey().lastIndexOf('/') + 1);
        storageService.deleteByPrefix(prefix);
        itemRepository.delete(id);
    }

    // --- Private helpers ---

    private String extractExtension(String filename) {
        if (filename == null) return "";
        int lastDot = filename.lastIndexOf('.');
        return lastDot >= 0 ? filename.substring(lastDot) : "";
    }

    private MediaDtos.MediaItemResponse toMediaItemResponse(MediaItemRepository.MediaItemRow row) {
        var storageKey = row.storageKey();
        var isPublic = storageKey.startsWith("public/");

        var originalUrl = isPublic
            ? storageService.getPublicUrl(storageKey)
            : storageService.generatePresignedUrl(storageKey, Duration.ofHours(1));

        return new MediaDtos.MediaItemResponse(
            row.id(), row.originalFilename(), originalUrl, null, null, null, null,
            row.mimeType(), row.fileSizeBytes(), row.width(), row.height(),
            row.altText(), row.createdAt());
    }
}
