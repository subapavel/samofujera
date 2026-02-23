package cz.samofujera.entitlement.internal;

import cz.samofujera.membership.MembershipService;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.UUID;

/**
 * Unified access check: direct entitlement -> subscription features -> deny.
 *
 * Subscriptions never create entitlement rows. Layer 2 checks the active
 * subscription's plan features JSONB at runtime.
 */
@Service
public class AccessChecker {

    private final EntitlementRepository entitlementRepository;
    private final MembershipService membershipService;

    AccessChecker(EntitlementRepository entitlementRepository,
                  MembershipService membershipService) {
        this.entitlementRepository = entitlementRepository;
        this.membershipService = membershipService;
    }

    public boolean hasAccess(UUID userId, String entityType, UUID entityId) {
        // Layer 1: Direct entitlement (purchase, lead magnet, admin, voucher)
        if (entitlementRepository.hasAccess(userId, entityType, entityId)) {
            return true;
        }

        // Layer 2: Active subscription with matching feature
        var features = membershipService.getActiveSubscriptionFeatures(userId);
        if (features != null && matchesFeature(features, entityType)) {
            return true;
        }

        // Layer 3: Denied
        return false;
    }

    private boolean matchesFeature(Map<String, Object> features, String entityType) {
        return switch (entityType) {
            case "ARTICLE" -> "all".equals(features.get("articles"));
            case "EVENT" -> "all".equals(features.get("online_events"));
            case "PRODUCT" -> {
                var value = features.get("video_library");
                yield Boolean.TRUE.equals(value) || "true".equals(value);
            }
            default -> false;
        };
    }
}
