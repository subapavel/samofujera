package cz.samofujera.catalog;

import cz.samofujera.shared.api.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
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

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<CatalogDtos.ImageResponse>> uploadImage(
            @PathVariable UUID productId,
            @RequestParam("file") MultipartFile file) throws IOException {

        var uploaded = catalogService.uploadImage(
            productId,
            file.getOriginalFilename(),
            file.getContentType(),
            file.getSize(),
            file.getInputStream()
        );

        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(uploaded));
    }

    @DeleteMapping("/{imageId}")
    public ResponseEntity<Void> deleteImage(
            @PathVariable UUID productId,
            @PathVariable UUID imageId) {

        catalogService.deleteImage(productId, imageId);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/reorder")
    public ResponseEntity<Void> reorderImages(
            @PathVariable UUID productId,
            @Valid @RequestBody CatalogDtos.ReorderImagesRequest request) {

        catalogService.reorderImages(productId, request.imageIds());
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/{imageId}/alt-text")
    public ResponseEntity<Void> updateAltText(
            @PathVariable UUID productId,
            @PathVariable UUID imageId,
            @RequestBody CatalogDtos.UpdateImageAltTextRequest request) {

        catalogService.updateImageAltText(productId, imageId, request.altText());
        return ResponseEntity.ok().build();
    }
}
