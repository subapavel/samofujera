package cz.samofujera.image;

import cz.samofujera.shared.api.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/images")
public class ImageAdminController {

    private final ImageService imageService;

    ImageAdminController(ImageService imageService) {
        this.imageService = imageService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<ImageDtos.ImageListResponse>> getItems(
            @RequestParam(required = false) String source,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "24") int limit) {
        var items = imageService.getItems(source, type, search, page, limit);
        return ResponseEntity.ok(ApiResponse.ok(items));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ImageDtos.ImageResponse>> getItem(@PathVariable UUID id) {
        var item = imageService.getById(id);
        return ResponseEntity.ok(ApiResponse.ok(item));
    }

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<ImageDtos.ImageResponse>> uploadAndCreate(
            @RequestParam("file") MultipartFile file,
            @RequestParam(required = false) String altText,
            @RequestParam(required = false) String title,
            @RequestParam(name = "public", required = false, defaultValue = "false") boolean isPublic)
            throws IOException {
        ImageDtos.ImageResponse response;
        if (isPublic) {
            response = imageService.uploadPublicAndCreate(
                file.getInputStream(), file.getOriginalFilename(),
                file.getContentType(), file.getSize(), altText, title);
        } else {
            response = imageService.uploadAndCreate(
                file.getInputStream(), file.getOriginalFilename(),
                file.getContentType(), file.getSize(), altText, title);
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(response));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<ApiResponse<ImageDtos.ImageResponse>> updateItem(
            @PathVariable UUID id,
            @Valid @RequestBody ImageDtos.UpdateImageRequest request) {
        var item = imageService.updateItem(id, request);
        return ResponseEntity.ok(ApiResponse.ok(item));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteItem(@PathVariable UUID id) {
        imageService.deleteItem(id);
        return ResponseEntity.noContent().build();
    }
}
