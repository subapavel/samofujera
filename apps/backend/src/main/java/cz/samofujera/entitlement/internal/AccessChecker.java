package cz.samofujera.entitlement.internal;

import org.springframework.stereotype.Service;

import java.util.UUID;

/**
 * Unified access check: direct entitlement -> subscription features -> deny.
 * Subscription check is a no-op until membership module is implemented.
 */
@Service
public class AccessChecker {

    private final EntitlementRepository entitlementRepository;

    AccessChecker(EntitlementRepository entitlementRepository) {
        this.entitlementRepository = entitlementRepository;
    }

    public boolean hasAccess(UUID userId, String entityType, UUID entityId) {
        // Layer 1: Direct entitlement
        if (entitlementRepository.hasAccess(userId, entityType, entityId)) {
            return true;
        }

        // Layer 2: Active subscription with matching feature (future - Step 4)
        // Will check subscriptions table + membership_plans.features JSONB

        // Layer 3: Denied
        return false;
    }
}
