package cz.samofujera.media;

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
@RequestMapping("/api/admin/media")
public class MediaAdminController {

    private final MediaService mediaService;

    MediaAdminController(MediaService mediaService) {
        this.mediaService = mediaService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<MediaDtos.MediaItemListResponse>> getItems(
            @RequestParam(required = false) String source,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "24") int limit) {
        var items = mediaService.getItems(source, type, search, page, limit);
        return ResponseEntity.ok(ApiResponse.ok(items));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<MediaDtos.MediaItemResponse>> getItem(@PathVariable UUID id) {
        var item = mediaService.getById(id);
        return ResponseEntity.ok(ApiResponse.ok(item));
    }

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<MediaDtos.MediaItemResponse>> uploadAndCreate(
            @RequestParam("file") MultipartFile file,
            @RequestParam(required = false) String altText,
            @RequestParam(name = "public", required = false, defaultValue = "false") boolean isPublic)
            throws IOException {
        MediaDtos.MediaItemResponse response;
        if (isPublic) {
            response = mediaService.uploadPublicAndCreate(
                file.getInputStream(), file.getOriginalFilename(),
                file.getContentType(), file.getSize(), altText);
        } else {
            response = mediaService.uploadAndCreate(
                file.getInputStream(), file.getOriginalFilename(),
                file.getContentType(), file.getSize(), altText);
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(response));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<ApiResponse<MediaDtos.MediaItemResponse>> updateItem(
            @PathVariable UUID id,
            @Valid @RequestBody MediaDtos.UpdateMediaItemRequest request) {
        var item = mediaService.updateItem(id, request);
        return ResponseEntity.ok(ApiResponse.ok(item));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteItem(@PathVariable UUID id) {
        mediaService.deleteItem(id);
        return ResponseEntity.noContent().build();
    }
}
