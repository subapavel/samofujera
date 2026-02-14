package cz.samofujera.entitlement.event;

import java.util.UUID;

public record EntitlementGrantedEvent(
    UUID userId,
    String userEmail,
    UUID productId,
    String productTitle,
    String productType
) {}
