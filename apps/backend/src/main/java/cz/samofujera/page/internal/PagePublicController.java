package cz.samofujera.page.internal;

import cz.samofujera.page.PageDtos;
import cz.samofujera.page.PageService;
import cz.samofujera.shared.api.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/pages")
class PagePublicController {

    private final PageService pageService;

    PagePublicController(PageService pageService) {
        this.pageService = pageService;
    }

    @GetMapping("/{slug}")
    ResponseEntity<ApiResponse<PageDtos.PublicPageResponse>> getPage(@PathVariable String slug) {
        var page = pageService.getPublishedPageBySlug(slug);
        return ResponseEntity.ok(ApiResponse.ok(page));
    }
}
