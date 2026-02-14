package cz.samofujera.catalog;

import cz.samofujera.shared.api.ApiResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/products/{productId}/assets")
public class AssetAdminController {

    private final CatalogService catalogService;

    AssetAdminController(CatalogService catalogService) {
        this.catalogService = catalogService;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<CatalogDtos.AssetResponse>> uploadAsset(
            @PathVariable UUID productId,
            @RequestParam("file") MultipartFile file) throws IOException {

        var asset = catalogService.uploadAsset(
            productId,
            file.getOriginalFilename(),
            file.getContentType(),
            file.getSize(),
            file.getInputStream()
        );

        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(asset));
    }

    @DeleteMapping("/{assetId}")
    public ResponseEntity<Void> deleteAsset(
            @PathVariable UUID productId,
            @PathVariable UUID assetId) {

        catalogService.deleteAsset(productId, assetId);
        return ResponseEntity.noContent().build();
    }
}
