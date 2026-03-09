package cz.samofujera.domain;

import cz.samofujera.domain.entity.EntitlementEntity;

import java.time.Instant;
import java.util.UUID;

public final class LibraryDtos {
    private LibraryDtos() {}

    public record EntitlementResponse(
            UUID id,
            String sourceType,
            UUID sourceId,
            String entityType,
            UUID entityId,
            Instant grantedAt,
            Instant expiresAt
    ) {
        public static EntitlementResponse from(EntitlementEntity e) {
            return new EntitlementResponse(
                    e.id, e.sourceType, e.sourceId,
                    e.entityType, e.entityId,
                    e.grantedAt, e.expiresAt
            );
        }
    }
}
