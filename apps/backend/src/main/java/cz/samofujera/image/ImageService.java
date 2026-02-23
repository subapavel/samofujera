package cz.samofujera.image;

import cz.samofujera.image.internal.ImageProcessingService;
import cz.samofujera.image.internal.ImageRepository;
import cz.samofujera.image.internal.ImageUsageResolver;
import cz.samofujera.shared.exception.NotFoundException;
import cz.samofujera.shared.storage.StorageService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.imageio.ImageIO;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.time.Duration;
import java.util.List;
import java.util.UUID;

@Service
public class ImageService {

    private final ImageRepository imageRepository;
    private final StorageService storageService;
    private final ImageProcessingService imageProcessingService;
    private final ImageUsageResolver imageUsageResolver;

    ImageService(ImageRepository imageRepository, StorageService storageService,
                 ImageProcessingService imageProcessingService, ImageUsageResolver imageUsageResolver) {
        this.imageRepository = imageRepository;
        this.storageService = storageService;
        this.imageProcessingService = imageProcessingService;
        this.imageUsageResolver = imageUsageResolver;
    }

    // --- Upload methods ---

    @Transactional
    public ImageDtos.ImageResponse uploadAndCreate(InputStream inputStream, String filename,
                                                    String contentType, long size,
                                                    String altText, String title) throws IOException {
        var newId = UUID.randomUUID();
        var ext = extractExtension(filename);
        var prefix = "images/" + newId + "/";
        var originalKey = prefix + "original" + ext;

        var originalData = inputStream.readAllBytes();

        // Optimize large images
        var optimized = imageProcessingService.optimizeIfNeeded(originalData, contentType);
        var dataToStore = optimized != null ? optimized : originalData;
        var actualSize = optimized != null ? (long) optimized.length : size;

        storageService.upload(originalKey, dataToStore, contentType);

        // Read image dimensions from the stored data
        Integer width = null;
        Integer height = null;
        if (contentType != null && contentType.startsWith("image/")) {
            var image = ImageIO.read(new ByteArrayInputStream(dataToStore));
            if (image != null) {
                width = image.getWidth();
                height = image.getHeight();
            }
        }

        var id = imageRepository.create(filename, originalKey, contentType, actualSize, width, height, altText, title);

        var created = imageRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Image not found"));
        return toImageResponse(created);
    }

    @Transactional
    public ImageDtos.ImageResponse uploadPublicAndCreate(InputStream inputStream, String filename,
                                                          String contentType, long size,
                                                          String altText, String title) throws IOException {
        var newId = UUID.randomUUID();
        var ext = extractExtension(filename);
        var prefix = "public/images/" + newId + "/";
        var originalKey = prefix + "original" + ext;

        var originalData = inputStream.readAllBytes();

        // Optimize large images
        var optimized = imageProcessingService.optimizeIfNeeded(originalData, contentType);
        var dataToStore = optimized != null ? optimized : originalData;
        var actualSize = optimized != null ? (long) optimized.length : size;

        storageService.upload(originalKey, dataToStore, contentType);

        Integer width = null;
        Integer height = null;
        if (contentType != null && contentType.startsWith("image/")) {
            var image = ImageIO.read(new ByteArrayInputStream(dataToStore));
            if (image != null) {
                width = image.getWidth();
                height = image.getHeight();
            }
        }

        var id = imageRepository.create(filename, originalKey, contentType, actualSize, width, height, altText, title);

        var created = imageRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Image not found"));
        return toImageResponse(created);
    }

    // --- Item methods ---

    public String getUrl(UUID id) {
        var item = imageRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Image not found"));
        var storageKey = item.storageKey();
        if (storageKey.startsWith("public/")) {
            return storageService.getPublicUrl(storageKey);
        }
        return storageService.generatePresignedUrl(storageKey, Duration.ofHours(1));
    }

    public ImageDtos.ImageListResponse getItems(String source, String type, String search,
                                                  int page, int limit) {
        int offset = Math.max(0, (page - 1) * limit);
        String mimeTypePrefix = type != null && !type.isBlank() ? type.toLowerCase() + "/" : null;

        var items = imageRepository.findAll(source, mimeTypePrefix, search, offset, limit);
        long totalItems = imageRepository.count(source, mimeTypePrefix, search);
        int totalPages = (int) Math.ceil((double) totalItems / limit);

        // Bulk resolve usages
        var imageIds = items.stream().map(ImageRepository.ImageRow::id).toList();
        var usagesMap = imageUsageResolver.findUsagesBulk(imageIds);

        var responses = items.stream()
            .map(row -> toImageResponse(row, usagesMap.getOrDefault(row.id(), List.of())))
            .toList();

        return new ImageDtos.ImageListResponse(responses, page, limit, totalItems, totalPages);
    }

    public ImageDtos.ImageResponse getById(UUID id) {
        var item = imageRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Image not found"));
        var usages = imageUsageResolver.findUsages(id);
        return toImageResponse(item, usages);
    }

    @Transactional
    public ImageDtos.ImageResponse updateItem(UUID id, ImageDtos.UpdateImageRequest request) {
        imageRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Image not found"));
        imageRepository.update(id, request.altText(), request.title());
        var updated = imageRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Image not found"));
        return toImageResponse(updated);
    }

    @Transactional
    public void deleteItem(UUID id) {
        var item = imageRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Image not found"));
        var prefix = item.storageKey().substring(0, item.storageKey().lastIndexOf('/') + 1);
        storageService.deleteByPrefix(prefix);
        imageRepository.delete(id);
    }

    // --- Private helpers ---

    private String extractExtension(String filename) {
        if (filename == null) return "";
        int lastDot = filename.lastIndexOf('.');
        return lastDot >= 0 ? filename.substring(lastDot) : "";
    }

    private ImageDtos.ImageResponse toImageResponse(ImageRepository.ImageRow row) {
        return toImageResponse(row, List.of());
    }

    private ImageDtos.ImageResponse toImageResponse(ImageRepository.ImageRow row, List<ImageDtos.UsageInfo> usages) {
        var storageKey = row.storageKey();
        var isPublic = storageKey.startsWith("public/");

        var url = isPublic
            ? storageService.getPublicUrl(storageKey)
            : storageService.generatePresignedUrl(storageKey, Duration.ofHours(1));

        return new ImageDtos.ImageResponse(
            row.id(), url, row.originalFilename(), row.mimeType(),
            row.fileSizeBytes(), row.width(), row.height(),
            row.title(), row.altText(), row.createdAt(), usages);
    }
}
