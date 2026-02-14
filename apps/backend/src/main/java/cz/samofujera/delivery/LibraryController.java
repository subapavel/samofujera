package cz.samofujera.delivery;

import cz.samofujera.auth.UserPrincipal;
import cz.samofujera.catalog.CatalogDtos;
import cz.samofujera.entitlement.EntitlementDtos;
import cz.samofujera.entitlement.EntitlementService;
import cz.samofujera.shared.api.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/library")
public class LibraryController {

    private final EntitlementService entitlementService;
    private final DeliveryService deliveryService;

    LibraryController(EntitlementService entitlementService, DeliveryService deliveryService) {
        this.entitlementService = entitlementService;
        this.deliveryService = deliveryService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<EntitlementDtos.LibraryItem>>> getLibrary(
            @AuthenticationPrincipal UserPrincipal principal) {
        var library = entitlementService.getLibrary(principal.getId());
        return ResponseEntity.ok(ApiResponse.ok(library));
    }

    @GetMapping("/{productId}/assets")
    public ResponseEntity<ApiResponse<List<CatalogDtos.AssetResponse>>> getProductAssets(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID productId) {
        var assets = deliveryService.getEntitledAssets(principal.getId(), productId);
        return ResponseEntity.ok(ApiResponse.ok(assets));
    }
}
