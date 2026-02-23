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
@RequestMapping("/api/admin/products/{productId}/content")
public class ProductContentAdminController {

    private final ProductContentService contentService;

    ProductContentAdminController(ProductContentService contentService) {
        this.contentService = contentService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<ProductContentDtos.ContentResponse>>> getContent(
            @PathVariable UUID productId) {
        var content = contentService.getContentForProduct(productId);
        return ResponseEntity.ok(ApiResponse.ok(content));
    }

    @PostMapping(path = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<ProductContentDtos.ContentResponse>> uploadContent(
            @PathVariable UUID productId,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "title", required = false) String title) throws IOException {

        var uploaded = contentService.uploadContent(
            productId,
            file.getInputStream(),
            file.getOriginalFilename(),
            file.getContentType(),
            file.getSize(),
            title != null ? title : file.getOriginalFilename()
        );

        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(uploaded));
    }

    @PostMapping("/stream")
    public ResponseEntity<ApiResponse<ProductContentDtos.ContentResponse>> linkStreamContent(
            @PathVariable UUID productId,
            @Valid @RequestBody ProductContentDtos.CreateStreamContentRequest request) {

        var content = contentService.linkStreamContent(productId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(content));
    }

    @PatchMapping("/{contentId}")
    public ResponseEntity<ApiResponse<ProductContentDtos.ContentResponse>> updateContent(
            @PathVariable UUID productId,
            @PathVariable UUID contentId,
            @Valid @RequestBody ProductContentDtos.UpdateContentRequest request) {

        var updated = contentService.updateContent(productId, contentId, request);
        return ResponseEntity.ok(ApiResponse.ok(updated));
    }

    @DeleteMapping("/{contentId}")
    public ResponseEntity<Void> deleteContent(
            @PathVariable UUID productId,
            @PathVariable UUID contentId) {

        contentService.deleteContent(productId, contentId);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/reorder")
    public ResponseEntity<Void> reorderContent(
            @PathVariable UUID productId,
            @Valid @RequestBody ProductContentDtos.ReorderContentRequest request) {

        contentService.reorderContent(productId, request);
        return ResponseEntity.noContent().build();
    }
}
