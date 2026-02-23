package cz.samofujera.catalog;

import cz.samofujera.catalog.internal.ProductContentRepository;
import cz.samofujera.catalog.internal.ProductContentRepository.ContentRow;
import cz.samofujera.catalog.internal.ProductRepository;
import cz.samofujera.shared.exception.NotFoundException;
import cz.samofujera.shared.storage.StorageService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.InputStream;
import java.time.Duration;
import java.util.List;
import java.util.UUID;

@Service
public class ProductContentService {

    private final ProductContentRepository contentRepository;
    private final ProductRepository productRepository;
    private final StorageService storageService;

    ProductContentService(ProductContentRepository contentRepository,
                          ProductRepository productRepository,
                          StorageService storageService) {
        this.contentRepository = contentRepository;
        this.productRepository = productRepository;
        this.storageService = storageService;
    }

    public List<ProductContentDtos.ContentResponse> getContentForProduct(UUID productId) {
        return contentRepository.findByProductId(productId).stream()
            .map(this::toResponse)
            .toList();
    }

    public ProductContentDtos.ContentResponse getContentById(UUID contentId) {
        var row = contentRepository.findById(contentId)
            .orElseThrow(() -> new NotFoundException("Content not found"));
        return toResponse(row);
    }

    @Transactional
    public ProductContentDtos.ContentResponse uploadContent(UUID productId, InputStream inputStream,
                                                              String filename, String mimeType,
                                                              long size, String title) {
        productRepository.findById(productId)
            .orElseThrow(() -> new NotFoundException("Product not found"));

        var contentType = resolveContentType(mimeType);
        var contentId = UUID.randomUUID();
        var ext = extractExtension(filename);
        var storageKey = "assets/" + productId + "/" + contentId + "/original" + ext;
        var sortOrder = contentRepository.countByProductId(productId);

        storageService.upload(storageKey, inputStream, size, mimeType);

        var id = contentRepository.create(
            productId, contentType, title != null ? title : filename, false,
            storageKey, filename, mimeType, size, null, null, sortOrder
        );

        return contentRepository.findById(id)
            .map(this::toResponse)
            .orElseThrow(() -> new NotFoundException("Content not found"));
    }

    @Transactional
    public ProductContentDtos.ContentResponse linkStreamContent(UUID productId,
                                                                  ProductContentDtos.CreateStreamContentRequest request) {
        productRepository.findById(productId)
            .orElseThrow(() -> new NotFoundException("Product not found"));

        var sortOrder = contentRepository.countByProductId(productId);
        var id = contentRepository.create(
            productId, request.contentType(), request.title(), false,
            null, null, null, null,
            request.streamUid(), request.durationSeconds(), sortOrder
        );

        return contentRepository.findById(id)
            .map(this::toResponse)
            .orElseThrow(() -> new NotFoundException("Content not found"));
    }

    @Transactional
    public ProductContentDtos.ContentResponse updateContent(UUID productId, UUID contentId,
                                                              ProductContentDtos.UpdateContentRequest request) {
        var row = contentRepository.findById(contentId)
            .orElseThrow(() -> new NotFoundException("Content not found"));
        if (!row.productId().equals(productId)) {
            throw new IllegalArgumentException("Content does not belong to product");
        }

        contentRepository.update(contentId, request.title(), request.isPreview());

        return contentRepository.findById(contentId)
            .map(this::toResponse)
            .orElseThrow(() -> new NotFoundException("Content not found"));
    }

    @Transactional
    public void deleteContent(UUID productId, UUID contentId) {
        var row = contentRepository.findById(contentId)
            .orElseThrow(() -> new NotFoundException("Content not found"));
        if (!row.productId().equals(productId)) {
            throw new IllegalArgumentException("Content does not belong to product");
        }
        if (row.storageKey() != null) {
            storageService.delete(row.storageKey());
        }
        contentRepository.delete(contentId);
    }

    @Transactional
    public void reorderContent(UUID productId, ProductContentDtos.ReorderContentRequest request) {
        contentRepository.reorder(productId, request.contentIds());
    }

    public String generateDownloadUrl(UUID contentId) {
        var row = contentRepository.findById(contentId)
            .orElseThrow(() -> new NotFoundException("Content not found"));
        if (row.storageKey() == null) {
            throw new IllegalStateException("Content has no downloadable file");
        }
        return storageService.generatePresignedUrl(row.storageKey(), Duration.ofMinutes(15));
    }

    private ProductContentDtos.ContentResponse toResponse(ContentRow row) {
        return new ProductContentDtos.ContentResponse(
            row.id(), row.productId(), row.contentType(), row.title(),
            row.isPreview(), row.originalFilename(), row.mimeType(),
            row.fileSizeBytes(), row.streamUid(), row.durationSeconds(),
            row.sortOrder(), row.createdAt()
        );
    }

    private String resolveContentType(String mimeType) {
        if (mimeType == null) return "FILE";
        if (mimeType.startsWith("video/")) return "VIDEO";
        if (mimeType.startsWith("audio/")) return "AUDIO";
        return "FILE";
    }

    private String extractExtension(String filename) {
        if (filename == null) return "";
        int dot = filename.lastIndexOf('.');
        return dot >= 0 ? filename.substring(dot) : "";
    }
}
