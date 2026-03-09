package cz.samofujera.domain.entity;

import io.quarkus.hibernate.reactive.panache.PanacheEntityBase;
import io.smallrye.mutiny.Uni;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "entitlements", schema = "quarkus_poc")
public class EntitlementEntity extends PanacheEntityBase {

    @Id
    @Column(columnDefinition = "uuid")
    public UUID id;

    @Column(name = "user_id", nullable = false)
    public Long userId;

    @Column(name = "source_type", nullable = false)
    public String sourceType;

    @Column(name = "source_id")
    public UUID sourceId;

    @Column(name = "granted_at", nullable = false)
    public Instant grantedAt;

    @Column(name = "expires_at")
    public Instant expiresAt;

    @Column(name = "revoked_at")
    public Instant revokedAt;

    @Column(name = "entity_type", nullable = false)
    public String entityType;

    @Column(name = "entity_id")
    public UUID entityId;

    @PrePersist
    public void prePersist() {
        if (id == null) id = UUID.randomUUID();
        if (grantedAt == null) grantedAt = Instant.now();
    }

    public static Uni<List<EntitlementEntity>> findActiveByUserId(Long userId) {
        return list("userId = ?1 AND revokedAt IS NULL AND (expiresAt IS NULL OR expiresAt > ?2)",
                userId, Instant.now());
    }

    public static Uni<EntitlementEntity> findActiveForUserAndEntity(Long userId, String entityType, UUID entityId) {
        return find("userId = ?1 AND entityType = ?2 AND entityId = ?3 AND revokedAt IS NULL AND (expiresAt IS NULL OR expiresAt > ?4)",
                userId, entityType, entityId, Instant.now()).firstResult();
    }
}
