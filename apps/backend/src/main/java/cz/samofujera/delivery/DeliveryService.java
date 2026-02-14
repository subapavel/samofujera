package cz.samofujera.delivery;

import cz.samofujera.catalog.CatalogDtos;
import cz.samofujera.catalog.CatalogService;
import cz.samofujera.delivery.internal.DownloadLogRepository;
import cz.samofujera.delivery.internal.RateLimitService;
import cz.samofujera.entitlement.EntitlementService;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.util.List;
import java.util.UUID;

@Service
public class DeliveryService {

    private final CatalogService catalogService;
    private final EntitlementService entitlementService;
    private final DownloadLogRepository downloadLogRepository;
    private final RateLimitService rateLimitService;

    DeliveryService(CatalogService catalogService, EntitlementService entitlementService,
                    DownloadLogRepository downloadLogRepository, RateLimitService rateLimitService) {
        this.catalogService = catalogService;
        this.entitlementService = entitlementService;
        this.downloadLogRepository = downloadLogRepository;
        this.rateLimitService = rateLimitService;
    }

    public DeliveryDtos.DownloadResponse generateDownload(UUID userId, UUID assetId,
                                                           String ipAddress, String userAgent) {
        // 1. Get asset info
        var asset = catalogService.getAssetById(assetId);

        // 2. Check entitlement
        if (!entitlementService.hasAccess(userId, asset.productId())) {
            throw new AccessDeniedException("No access to this asset");
        }

        // 3. Check rate limit (max 5 downloads per hour)
        if (rateLimitService.isRateLimited(userId, 5)) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Download rate limit exceeded");
        }

        // 4. Generate presigned URL (15 min TTL)
        var downloadUrl = catalogService.generateAssetDownloadUrl(assetId, Duration.ofMinutes(15));

        // 5. Log download
        downloadLogRepository.log(userId, assetId, ipAddress, userAgent);

        // 6. Return response
        return new DeliveryDtos.DownloadResponse(downloadUrl, asset.fileName(), asset.fileSizeBytes());
    }

    public List<CatalogDtos.AssetResponse> getEntitledAssets(UUID userId, UUID productId) {
        if (!entitlementService.hasAccess(userId, productId)) {
            throw new AccessDeniedException("No access to this product");
        }
        return catalogService.getAssetsForProduct(productId);
    }
}
