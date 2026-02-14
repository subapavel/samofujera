package cz.samofujera.delivery;

import cz.samofujera.auth.UserPrincipal;
import cz.samofujera.shared.api.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/delivery")
public class DeliveryController {

    private final DeliveryService deliveryService;

    DeliveryController(DeliveryService deliveryService) {
        this.deliveryService = deliveryService;
    }

    @GetMapping("/download/{assetId}")
    public ResponseEntity<ApiResponse<DeliveryDtos.DownloadResponse>> download(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID assetId,
            HttpServletRequest request) {
        var ipAddress = request.getRemoteAddr();
        var userAgent = request.getHeader("User-Agent");
        var result = deliveryService.generateDownload(principal.getId(), assetId, ipAddress, userAgent);
        return ResponseEntity.ok(ApiResponse.ok(result));
    }
}
