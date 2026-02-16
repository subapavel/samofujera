package cz.samofujera.media;

import cz.samofujera.media.internal.ImageVariantService;
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
    private final ImageVariantService imageVariantService;

    MediaService(MediaItemRepository itemRepository, StorageService storageService,
                 ImageVariantService imageVariantService) {
        this.itemRepository = itemRepository;
        this.storageService = storageService;
        this.imageVariantService = imageVariantService;
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

        // Generate and upload image variants
        var variants = imageVariantService.generateVariants(originalData, contentType);
        for (var entry : variants.entrySet()) {
            var variantKey = prefix + entry.getKey() + ".webp";
            storageService.upload(variantKey, entry.getValue().data(), entry.getValue().contentType());
        }

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

    // --- Item methods ---

    public MediaDtos.MediaItemListResponse getItems(String source, String type, String search,
                                                     int page, int limit) {
        int offset = Math.max(0, (page - 1) * limit);
        String mimeTypePrefix = type != null && !type.isBlank() ? type + "/" : null;

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

    public String getUrl(UUID id) {
        var item = itemRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Media item not found"));
        return storageService.generatePresignedUrl(item.storageKey(), Duration.ofHours(1));
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
        var prefix = storageKey.substring(0, storageKey.lastIndexOf('/') + 1);
        var originalUrl = storageService.generatePresignedUrl(storageKey, Duration.ofHours(1));

        String thumbUrl = null, mediumUrl = null, largeUrl = null, ogUrl = null;
        if (row.mimeType() != null && row.mimeType().startsWith("image/")) {
            thumbUrl = storageService.generatePresignedUrl(prefix + "thumb.webp", Duration.ofHours(1));
            mediumUrl = storageService.generatePresignedUrl(prefix + "medium.webp", Duration.ofHours(1));
            largeUrl = storageService.generatePresignedUrl(prefix + "large.webp", Duration.ofHours(1));
            ogUrl = storageService.generatePresignedUrl(prefix + "og.webp", Duration.ofHours(1));
        }

        return new MediaDtos.MediaItemResponse(
            row.id(), row.originalFilename(), originalUrl, thumbUrl, mediumUrl, largeUrl, ogUrl,
            row.mimeType(), row.fileSizeBytes(), row.width(), row.height(),
            row.altText(), row.createdAt());
    }
}
