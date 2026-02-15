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

    public DeliveryDtos.DownloadResponse generateDownload(UUID userId, UUID fileId,
                                                           String ipAddress, String userAgent) {
        var file = catalogService.getFileById(fileId);

        if (!entitlementService.hasAccess(userId, file.productId())) {
            throw new AccessDeniedException("No access to this file");
        }

        if (rateLimitService.isRateLimited(userId, 5)) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Download rate limit exceeded");
        }

        var downloadUrl = catalogService.generateFileDownloadUrl(fileId, Duration.ofMinutes(15));
        downloadLogRepository.log(userId, fileId, ipAddress, userAgent);

        return new DeliveryDtos.DownloadResponse(downloadUrl, file.fileName(), file.fileSizeBytes());
    }

    public List<CatalogDtos.FileResponse> getEntitledFiles(UUID userId, UUID productId) {
        if (!entitlementService.hasAccess(userId, productId)) {
            throw new AccessDeniedException("No access to this product");
        }
        return catalogService.getFilesForProduct(productId);
    }

    public DeliveryDtos.StreamResponse getEntitledMedia(UUID userId, UUID productId) {
        if (!entitlementService.hasAccess(userId, productId)) {
            throw new AccessDeniedException("No access to this product");
        }
        var mediaList = catalogService.getMediaForProduct(productId);
        var items = mediaList.stream()
            .map(m -> new DeliveryDtos.StreamItem(
                m.id(), m.title(), m.mediaType(), m.cfStreamUid(),
                m.durationSeconds(), m.sortOrder()
            ))
            .toList();
        return new DeliveryDtos.StreamResponse(items);
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
