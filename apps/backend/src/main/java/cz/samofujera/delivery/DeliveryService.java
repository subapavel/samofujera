package cz.samofujera.delivery;

import cz.samofujera.catalog.CatalogService;
import cz.samofujera.catalog.ProductContentDtos;
import cz.samofujera.delivery.internal.DownloadLogRepository;
import cz.samofujera.delivery.internal.RateLimitService;
import cz.samofujera.entitlement.EntitlementService;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

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

    public DeliveryDtos.DownloadResponse generateDownload(UUID userId, UUID contentId,
                                                           String ipAddress, String userAgent) {
        var content = catalogService.getContentById(contentId);

        if (!entitlementService.hasAccess(userId, content.productId())) {
            throw new AccessDeniedException("No access to this content");
        }

        if (rateLimitService.isRateLimited(userId, 5)) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Download rate limit exceeded");
        }

        var downloadUrl = catalogService.generateContentDownloadUrl(contentId);
        downloadLogRepository.log(userId, contentId, ipAddress, userAgent);

        var fileName = content.originalFilename() != null ? content.originalFilename() : content.title();
        var fileSize = content.fileSizeBytes() != null ? content.fileSizeBytes() : 0L;
        return new DeliveryDtos.DownloadResponse(downloadUrl, fileName, fileSize);
    }

    public List<ProductContentDtos.ContentResponse> getEntitledContent(UUID userId, UUID productId) {
        if (!entitlementService.hasAccess(userId, productId)) {
            throw new AccessDeniedException("No access to this product");
        }
        return catalogService.getContentForProduct(productId);
    }

    public DeliveryDtos.EventAccessResponse getEntitledEventAccess(UUID userId, UUID productId) {
        if (!entitlementService.hasAccess(userId, productId)) {
            throw new AccessDeniedException("No access to this event");
        }
        var event = catalogService.getEventForProduct(productId);
        var occurrences = catalogService.getOccurrencesForProduct(productId).stream()
            .map(o -> new DeliveryDtos.OccurrenceItem(
                o.id(), o.startsAt(), o.endsAt(), o.status(), o.streamUrl()
            ))
            .toList();
        return new DeliveryDtos.EventAccessResponse(
            event.id(), event.venue(), event.capacity(), event.isOnline(),
            event.streamUrl(), occurrences
        );
    }
}
