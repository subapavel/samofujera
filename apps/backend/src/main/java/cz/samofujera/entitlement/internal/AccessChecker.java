package cz.samofujera.entitlement.internal;

import cz.samofujera.membership.MembershipService;
import org.springframework.stereotype.Service;

import java.util.UUID;

/**
 * Unified access check: direct entitlement -> subscription features -> deny.
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
        // Layer 1: Direct entitlement
        if (entitlementRepository.hasAccess(userId, entityType, entityId)) {
            return true;
        }

        // Layer 2: Active subscription with matching feature
        // Features JSONB keys map to entity types (e.g. "articles", "video_library")
        // If the entity_type matches a feature key and value is "all" or true -> GRANTED
        if (membershipService.hasFeature(userId, entityType.toLowerCase())) {
            return true;
        }

        // Layer 3: Denied
        return false;
    }
}
