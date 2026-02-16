package cz.samofujera.media;

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
@RequestMapping("/api/admin/media")
public class MediaAdminController {

    private final MediaService mediaService;

    MediaAdminController(MediaService mediaService) {
        this.mediaService = mediaService;
    }

    // --- Folder endpoints ---

    @GetMapping("/folders")
    public ResponseEntity<ApiResponse<List<MediaDtos.FolderResponse>>> getFolders() {
        var folders = mediaService.getFolders();
        return ResponseEntity.ok(ApiResponse.ok(folders));
    }

    @PostMapping("/folders")
    public ResponseEntity<ApiResponse<MediaDtos.FolderResponse>> createFolder(
            @Valid @RequestBody MediaDtos.CreateFolderRequest request) {
        var folder = mediaService.createFolder(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(folder));
    }

    @PutMapping("/folders/{id}")
    public ResponseEntity<ApiResponse<MediaDtos.FolderResponse>> renameFolder(
            @PathVariable UUID id,
            @Valid @RequestBody MediaDtos.RenameFolderRequest request) {
        var folder = mediaService.renameFolder(id, request);
        return ResponseEntity.ok(ApiResponse.ok(folder));
    }

    @DeleteMapping("/folders/{id}")
    public ResponseEntity<Void> deleteFolder(@PathVariable UUID id) {
        mediaService.deleteFolder(id);
        return ResponseEntity.noContent().build();
    }

    // --- Item endpoints ---

    @GetMapping
    public ResponseEntity<ApiResponse<MediaDtos.MediaItemListResponse>> getItems(
            @RequestParam(required = false) UUID folderId,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "24") int limit) {
        var items = mediaService.getItems(folderId, type, search, page, limit);
        return ResponseEntity.ok(ApiResponse.ok(items));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<MediaDtos.MediaItemResponse>> getItem(@PathVariable UUID id) {
        var item = mediaService.getById(id);
        return ResponseEntity.ok(ApiResponse.ok(item));
    }

    @PostMapping(value = "/upload-temp", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<MediaDtos.TempUploadResponse>> uploadTemp(
            @RequestParam("file") MultipartFile file) throws IOException {
        var response = mediaService.uploadTemp(
            file.getInputStream(),
            file.getOriginalFilename(),
            file.getContentType(),
            file.getSize()
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(response));
    }

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<MediaDtos.MediaItemResponse>> uploadAndCreate(
            @RequestParam("file") MultipartFile file,
            @RequestParam(required = false) UUID folderId,
            @RequestParam(required = false) String altText) throws IOException {
        var response = mediaService.uploadAndCreate(
            file.getInputStream(),
            file.getOriginalFilename(),
            file.getContentType(),
            file.getSize(),
            folderId,
            altText
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(response));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<MediaDtos.MediaItemResponse>> createFromTemp(
            @Valid @RequestBody MediaDtos.CreateMediaItemRequest request) {
        var item = mediaService.createFromTemp(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(item));
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
