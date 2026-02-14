package cz.samofujera.catalog;

import cz.samofujera.shared.api.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/catalog")
public class CatalogController {

    private final CatalogService catalogService;

    CatalogController(CatalogService catalogService) {
        this.catalogService = catalogService;
    }

    @GetMapping("/categories")
    public ResponseEntity<ApiResponse<List<CatalogDtos.CategoryResponse>>> getCategories() {
        var categories = catalogService.getCategoryTree();
        return ResponseEntity.ok(ApiResponse.ok(categories));
    }

    @GetMapping("/products")
    public ResponseEntity<ApiResponse<CatalogDtos.ProductListResponse>> getProducts(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int limit,
            @RequestParam(required = false) UUID category,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String search) {
        var result = catalogService.getProducts("ACTIVE", category, type, search, page, limit);
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @GetMapping("/products/{slug}")
    public ResponseEntity<ApiResponse<CatalogDtos.ProductDetailResponse>> getProductBySlug(
            @PathVariable String slug) {
        var product = catalogService.getProductBySlug(slug);
        return ResponseEntity.ok(ApiResponse.ok(product));
    }
}
