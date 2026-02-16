package cz.samofujera.catalog;

import cz.samofujera.shared.api.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/products/{productId}/media")
public class ProductMediaAdminController {

    private final CatalogService catalogService;

    ProductMediaAdminController(CatalogService catalogService) {
        this.catalogService = catalogService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<CatalogDtos.MediaResponse>>> getMedia(
            @PathVariable UUID productId) {
        var media = catalogService.getMediaForProduct(productId);
        return ResponseEntity.ok(ApiResponse.ok(media));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<CatalogDtos.MediaResponse>> createMedia(
            @PathVariable UUID productId,
            @Valid @RequestBody CatalogDtos.CreateMediaRequest request) {
        var media = catalogService.createMedia(productId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(media));
    }

    @DeleteMapping("/{mediaId}")
    public ResponseEntity<Void> deleteMedia(
            @PathVariable UUID productId,
            @PathVariable UUID mediaId) {
        catalogService.deleteMedia(productId, mediaId);
        return ResponseEntity.noContent().build();
    }
}
