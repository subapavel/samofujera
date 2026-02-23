package cz.samofujera.entitlement;

import cz.samofujera.catalog.CatalogService;
import cz.samofujera.entitlement.event.EntitlementGrantedEvent;
import cz.samofujera.entitlement.internal.EntitlementRepository;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class EntitlementService {

    private final EntitlementRepository entitlementRepository;
    private final CatalogService catalogService;
    private final ApplicationEventPublisher eventPublisher;

    EntitlementService(EntitlementRepository entitlementRepository,
                       CatalogService catalogService,
                       ApplicationEventPublisher eventPublisher) {
        this.entitlementRepository = entitlementRepository;
        this.catalogService = catalogService;
        this.eventPublisher = eventPublisher;
    }

    @Transactional
    public void grantAccess(UUID userId, String entityType, UUID entityId,
                            String sourceType, UUID sourceId, OffsetDateTime expiresAt,
                            String userEmail, String entityTitle, String entitySubType) {
        entitlementRepository.grant(userId, entityType, entityId, sourceType, sourceId, expiresAt);
        eventPublisher.publishEvent(new EntitlementGrantedEvent(
            userId, userEmail, entityType, entityId, entityTitle, entitySubType));
    }

    // Convenience method for product entitlements (backward compatibility)
    @Transactional
    public void grantProductAccess(UUID userId, UUID productId, String sourceType, UUID sourceId,
                                    String userEmail, String productTitle, String productType) {
        grantAccess(userId, "PRODUCT", productId, sourceType, sourceId, null,
                    userEmail, productTitle, productType);
    }

    public boolean hasAccess(UUID userId, String entityType, UUID entityId) {
        return entitlementRepository.hasAccess(userId, entityType, entityId);
    }

    // Convenience method for product access checks
    public boolean hasProductAccess(UUID userId, UUID productId) {
        return hasAccess(userId, "PRODUCT", productId);
    }

    public List<EntitlementDtos.LibraryItem> getLibrary(UUID userId) {
        var entitlements = entitlementRepository.findByUserIdAndEntityType(userId, "PRODUCT");
        return entitlements.stream()
            .map(row -> {
                String title = null;
                String type = null;
                String thumbnailUrl = null;
                try {
                    var product = catalogService.getProductById(row.entityId());
                    title = product.title();
                    type = product.productType();
                    thumbnailUrl = product.thumbnailUrl();
                } catch (Exception e) {
                    // Entity may have been deleted
                }
                return new EntitlementDtos.LibraryItem(
                    row.entityId(), title, type, thumbnailUrl, row.grantedAt());
            })
            .toList();
    }

    @Transactional
    public void revokeAccess(UUID userId, String entityType, UUID entityId) {
        entitlementRepository.revoke(userId, entityType, entityId);
    }

    @Transactional
    public void revokeById(UUID entitlementId) {
        entitlementRepository.revokeById(entitlementId);
    }
}
