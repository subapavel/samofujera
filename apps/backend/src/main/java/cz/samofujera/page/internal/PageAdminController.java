package cz.samofujera.page.internal;

import cz.samofujera.page.PageDtos;
import cz.samofujera.page.PageService;
import cz.samofujera.shared.api.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/admin/pages")
class PageAdminController {

    private final PageService pageService;

    PageAdminController(PageService pageService) {
        this.pageService = pageService;
    }

    @GetMapping
    ResponseEntity<ApiResponse<PageDtos.PageListResponse>> getPages(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int limit,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String search) {
        var result = pageService.getPages(status, type, search, page, limit);
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @GetMapping("/{id}")
    ResponseEntity<ApiResponse<PageDtos.PageDetailResponse>> getPage(@PathVariable UUID id) {
        var detail = pageService.getPageById(id);
        return ResponseEntity.ok(ApiResponse.ok(detail));
    }

    @PostMapping
    ResponseEntity<ApiResponse<PageDtos.PageDetailResponse>> createPage(
            @Valid @RequestBody PageDtos.CreatePageRequest request) {
        var page = pageService.createPage(request, null);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(page));
    }

    @PutMapping("/{id}")
    ResponseEntity<ApiResponse<PageDtos.PageDetailResponse>> updatePage(
            @PathVariable UUID id,
            @Valid @RequestBody PageDtos.UpdatePageRequest request) {
        var page = pageService.updatePage(id, request);
        return ResponseEntity.ok(ApiResponse.ok(page));
    }

    @PutMapping("/{id}/publish")
    ResponseEntity<Void> publishPage(@PathVariable UUID id) {
        pageService.publishPage(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/unpublish")
    ResponseEntity<Void> unpublishPage(@PathVariable UUID id) {
        pageService.unpublishPage(id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    ResponseEntity<Void> deletePage(@PathVariable UUID id) {
        pageService.deletePage(id);
        return ResponseEntity.noContent().build();
    }
}
