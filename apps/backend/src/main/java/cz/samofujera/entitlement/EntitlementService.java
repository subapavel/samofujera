package cz.samofujera.entitlement;

import cz.samofujera.catalog.CatalogService;
import cz.samofujera.entitlement.event.EntitlementGrantedEvent;
import cz.samofujera.entitlement.internal.EntitlementRepository;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
    public void grantAccess(UUID userId, UUID productId, String sourceType, UUID sourceId,
                            String userEmail, String productTitle, String productType) {
        entitlementRepository.grant(userId, productId, sourceType, sourceId);
        eventPublisher.publishEvent(new EntitlementGrantedEvent(
            userId, userEmail, productId, productTitle, productType));
    }

    public boolean hasAccess(UUID userId, UUID productId) {
        return entitlementRepository.hasAccess(userId, productId);
    }

    public List<EntitlementDtos.LibraryItem> getLibrary(UUID userId) {
        var entitlements = entitlementRepository.findByUserId(userId);
        return entitlements.stream()
            .map(row -> {
                String title = null;
                String type = null;
                String thumbnailUrl = null;
                try {
                    var product = catalogService.getProductById(row.productId());
                    title = product.title();
                    type = product.productType();
                    thumbnailUrl = product.thumbnailUrl();
                } catch (Exception e) {
                    // Product may have been deleted; use fallback values
                }
                return new EntitlementDtos.LibraryItem(
                    row.productId(), title, type, thumbnailUrl, row.grantedAt());
            })
            .toList();
    }

    @Transactional
    public void revokeAccess(UUID userId, UUID productId) {
        entitlementRepository.revoke(userId, productId);
    }
}
