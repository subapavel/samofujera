package cz.samofujera.catalog;

import cz.samofujera.shared.api.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

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
}
