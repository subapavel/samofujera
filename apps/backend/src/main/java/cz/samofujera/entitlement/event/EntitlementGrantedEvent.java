package cz.samofujera.entitlement.event;

import java.util.UUID;

public record EntitlementGrantedEvent(
    UUID userId,
    String userEmail,
    String entityType,
    UUID entityId,
    String entityTitle,
    String entitySubType
) {}
