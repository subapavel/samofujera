package cz.samofujera.lead;

import cz.samofujera.catalog.CatalogService;
import cz.samofujera.entitlement.EntitlementService;
import cz.samofujera.lead.internal.LeadCaptureRepository;
import cz.samofujera.shared.exception.NotFoundException;
import cz.samofujera.user.UserService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.UUID;

@Service
public class LeadService {

    private final LeadCaptureRepository leadCaptureRepository;
    private final CatalogService catalogService;
    private final EntitlementService entitlementService;
    private final UserService userService;

    LeadService(LeadCaptureRepository leadCaptureRepository,
                CatalogService catalogService,
                EntitlementService entitlementService,
                UserService userService) {
        this.leadCaptureRepository = leadCaptureRepository;
        this.catalogService = catalogService;
        this.entitlementService = entitlementService;
        this.userService = userService;
    }

    @Transactional
    public LeadDtos.LeadCaptureResponse captureLead(String entityType, String slug, String email,
                                                     String utmSource, String utmMedium,
                                                     String utmCampaign, String utmContent,
                                                     String referrerUrl, String ipAddress) {
        // 1. Look up product by slug
        var product = catalogService.getProductBySlug(slug);

        // 2. Validate: must be UNLISTED, or ACTIVE with price = 0
        var status = product.status();
        var prices = product.prices();
        boolean isFree = prices == null || prices.isEmpty()
            || prices.values().stream().allMatch(p -> p.compareTo(BigDecimal.ZERO) == 0);

        if (!"UNLISTED".equals(status) && !("ACTIVE".equals(status) && isFree)) {
            throw new IllegalArgumentException("Product is not available as a lead magnet");
        }

        // 3. Find or create user by email
        var userId = userService.findOrCreateByEmail(email);

        // 4. Check if lead already captured for this email + entity
        if (leadCaptureRepository.existsByEmailAndEntity(email, entityType, product.id())) {
            // Already captured — still return success (don't reveal state)
            return new LeadDtos.LeadCaptureResponse(true, "Check your email");
        }

        // 5. Create lead_capture record
        leadCaptureRepository.create(userId, entityType, product.id(), email,
            utmSource, utmMedium, utmCampaign, utmContent, referrerUrl, ipAddress);

        // 6. Grant entitlement if not already present
        if (!entitlementService.hasAccess(userId, "PRODUCT", product.id())) {
            entitlementService.grantAccess(
                userId, "PRODUCT", product.id(),
                "LEAD_MAGNET", null, null,
                email, product.title(), product.productType()
            );
        }

        // 7. Return success
        return new LeadDtos.LeadCaptureResponse(true, "Check your email");
    }

    public LeadDtos.LeadStatsResponse getStats(String entityType, UUID entityId) {
        var totalCaptures = leadCaptureRepository.countByEntityId(entityType, entityId);
        var uniqueEmails = leadCaptureRepository.countUniqueEmailsByEntityId(entityType, entityId);
        return new LeadDtos.LeadStatsResponse(totalCaptures, uniqueEmails);
    }
}
