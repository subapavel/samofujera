package cz.samofujera.catalog;

import cz.samofujera.shared.api.ApiResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/products/{productId}/images")
public class ImageAdminController {

    private final CatalogService catalogService;

    ImageAdminController(CatalogService catalogService) {
        this.catalogService = catalogService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<CatalogDtos.ImageResponse>>> getImages(
            @PathVariable UUID productId) {
        var images = catalogService.getImagesForProduct(productId);
        return ResponseEntity.ok(ApiResponse.ok(images));
    }

    @PostMapping
    public ResponseEntity<Void> addImage(
            @PathVariable UUID productId,
            @RequestBody AddImageRequest request) {
        catalogService.addImageToProduct(productId, request.imageId(),
            request.panX() != null ? request.panX() : 50,
            request.panY() != null ? request.panY() : 50);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @DeleteMapping("/{imageId}")
    public ResponseEntity<Void> removeImage(
            @PathVariable UUID productId,
            @PathVariable UUID imageId) {
        catalogService.removeImageFromProduct(productId, imageId);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/reorder")
    public ResponseEntity<Void> reorderImages(
            @PathVariable UUID productId,
            @RequestBody CatalogDtos.ReorderImagesRequest request) {
        catalogService.reorderProductImages(productId, request.imageIds());
        return ResponseEntity.ok().build();
    }

    record AddImageRequest(UUID imageId, Integer panX, Integer panY) {}
}
