package cz.samofujera.catalog;

import cz.samofujera.shared.api.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/admin/products/{productId}/variants")
public class VariantAdminController {

    private final CatalogService catalogService;

    VariantAdminController(CatalogService catalogService) {
        this.catalogService = catalogService;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<CatalogDtos.VariantResponse>> createVariant(
            @PathVariable UUID productId,
            @Valid @RequestBody CatalogDtos.CreateVariantRequest request) {
        var variant = catalogService.createVariant(productId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(variant));
    }

    @PutMapping("/{variantId}")
    public ResponseEntity<ApiResponse<CatalogDtos.VariantResponse>> updateVariant(
            @PathVariable UUID productId,
            @PathVariable UUID variantId,
            @Valid @RequestBody CatalogDtos.CreateVariantRequest request) {
        var variant = catalogService.updateVariant(productId, variantId, request);
        return ResponseEntity.ok(ApiResponse.ok(variant));
    }

    @DeleteMapping("/{variantId}")
    public ResponseEntity<Void> deleteVariant(
            @PathVariable UUID productId,
            @PathVariable UUID variantId) {
        catalogService.deleteVariant(productId, variantId);
        return ResponseEntity.noContent().build();
    }
}
