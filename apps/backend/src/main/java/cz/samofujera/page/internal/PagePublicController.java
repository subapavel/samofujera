package cz.samofujera.page.internal;

import cz.samofujera.page.PageDtos;
import cz.samofujera.page.PageService;
import cz.samofujera.shared.api.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/pages")
class PagePublicController {

    private final PageService pageService;

    PagePublicController(PageService pageService) {
        this.pageService = pageService;
    }

    @GetMapping("/{slug}")
    ResponseEntity<ApiResponse<PageDtos.PublicPageResponse>> getPage(
            @PathVariable String slug,
            @RequestParam(defaultValue = "false") boolean preview,
            Authentication authentication) {
        if (preview && isAdmin(authentication)) {
            var page = pageService.getPageBySlug(slug);
            return ResponseEntity.ok(ApiResponse.ok(page));
        }
        var page = pageService.getPublishedPageBySlug(slug);
        return ResponseEntity.ok(ApiResponse.ok(page));
    }

    private boolean isAdmin(Authentication authentication) {
        return authentication != null
                && authentication.isAuthenticated()
                && authentication.getAuthorities().contains(new SimpleGrantedAuthority("ROLE_ADMIN"));
    }
}
