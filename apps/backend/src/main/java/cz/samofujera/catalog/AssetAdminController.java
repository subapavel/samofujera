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
@RequestMapping("/api/admin/products/{productId}/files")
public class AssetAdminController {

    private final CatalogService catalogService;

    AssetAdminController(CatalogService catalogService) {
        this.catalogService = catalogService;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<CatalogDtos.FileResponse>> uploadFile(
            @PathVariable UUID productId,
            @RequestParam("file") MultipartFile file) throws IOException {

        var uploaded = catalogService.uploadFile(
            productId,
            file.getOriginalFilename(),
            file.getContentType(),
            file.getSize(),
            file.getInputStream()
        );

        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(uploaded));
    }

    @DeleteMapping("/{fileId}")
    public ResponseEntity<Void> deleteFile(
            @PathVariable UUID productId,
            @PathVariable UUID fileId) {

        catalogService.deleteFile(productId, fileId);
        return ResponseEntity.noContent().build();
    }
}
