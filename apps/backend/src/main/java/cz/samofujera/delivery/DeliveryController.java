package cz.samofujera.delivery;

import cz.samofujera.auth.UserPrincipal;
import cz.samofujera.catalog.ProductContentDtos;
import cz.samofujera.shared.api.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/delivery")
public class DeliveryController {

    private final DeliveryService deliveryService;

    DeliveryController(DeliveryService deliveryService) {
        this.deliveryService = deliveryService;
    }

    @GetMapping("/{contentId}/download")
    public ResponseEntity<ApiResponse<DeliveryDtos.DownloadResponse>> download(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID contentId,
            HttpServletRequest request) {
        var ipAddress = request.getRemoteAddr();
        var userAgent = request.getHeader("User-Agent");
        var result = deliveryService.generateDownload(principal.getId(), contentId, ipAddress, userAgent);
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @GetMapping("/{productId}/content")
    public ResponseEntity<ApiResponse<List<ProductContentDtos.ContentResponse>>> getContent(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID productId) {
        var result = deliveryService.getEntitledContent(principal.getId(), productId);
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @GetMapping("/{productId}/event")
    public ResponseEntity<ApiResponse<DeliveryDtos.EventAccessResponse>> eventAccess(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID productId) {
        var result = deliveryService.getEntitledEventAccess(principal.getId(), productId);
        return ResponseEntity.ok(ApiResponse.ok(result));
    }
}
