package cz.samofujera.catalog;

import cz.samofujera.shared.api.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/admin/products")
public class ProductAdminController {

    private final CatalogService catalogService;

    ProductAdminController(CatalogService catalogService) {
        this.catalogService = catalogService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<CatalogDtos.ProductListResponse>> getProducts(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int limit,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String search) {
        var result = catalogService.getProducts(status, category, type, search, page, limit);
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<CatalogDtos.ProductDetailResponse>> getProduct(@PathVariable UUID id) {
        var detail = catalogService.getProductDetailById(id);
        return ResponseEntity.ok(ApiResponse.ok(detail));
    }

    @PostMapping("/draft")
    public ResponseEntity<ApiResponse<CatalogDtos.ProductDetailResponse>> createDraft(
            @Valid @RequestBody CatalogDtos.CreateDraftRequest request) {
        var product = catalogService.createDraft(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(product));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<CatalogDtos.ProductResponse>> createProduct(
            @Valid @RequestBody CatalogDtos.CreateProductRequest request) {
        var product = catalogService.createProduct(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(product));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<CatalogDtos.ProductResponse>> updateProduct(
            @PathVariable UUID id,
            @Valid @RequestBody CatalogDtos.UpdateProductRequest request) {
        var product = catalogService.updateProduct(id, request);
        return ResponseEntity.ok(ApiResponse.ok(product));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteProduct(@PathVariable UUID id) {
        catalogService.archiveProduct(id);
        return ResponseEntity.noContent().build();
    }
}
