package cz.samofujera.catalog;

import cz.samofujera.shared.api.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/categories")
public class CatalogAdminController {

    private final CatalogService catalogService;

    CatalogAdminController(CatalogService catalogService) {
        this.catalogService = catalogService;
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<CatalogDtos.CategoryResponse>> getCategory(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(catalogService.getCategoryById(id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<CatalogDtos.CategoryResponse>> createCategory(
            @Valid @RequestBody CatalogDtos.CreateCategoryRequest request) {
        var category = catalogService.createCategory(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(category));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<CatalogDtos.CategoryResponse>> updateCategory(
            @PathVariable UUID id,
            @Valid @RequestBody CatalogDtos.UpdateCategoryRequest request) {
        var category = catalogService.updateCategory(id, request);
        return ResponseEntity.ok(ApiResponse.ok(category));
    }

    @PutMapping("/reorder")
    public ResponseEntity<Void> reorderCategories(
            @Valid @RequestBody CatalogDtos.ReorderCategoriesRequest request) {
        catalogService.reorderCategories(request.categoryIds());
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCategory(@PathVariable UUID id) {
        catalogService.deleteCategory(id);
        return ResponseEntity.noContent().build();
    }
}
