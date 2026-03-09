package cz.samofujera.domain.entity;

import io.quarkus.hibernate.reactive.panache.PanacheEntityBase;
import io.smallrye.mutiny.Uni;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "subscriptions")
public class SubscriptionEntity extends PanacheEntityBase {

    @Id
    @Column(columnDefinition = "uuid")
    public UUID id;

    @Column(name = "user_id", nullable = false)
    public Long userId;

    @Column(name = "plan_id", nullable = false)
    public UUID planId;

    @Column(name = "stripe_subscription_id")
    public String stripeSubscriptionId;

    @Column(nullable = false)
    public String status;

    @Column(name = "current_period_start")
    public Instant currentPeriodStart;

    @Column(name = "current_period_end")
    public Instant currentPeriodEnd;

    @Column(name = "cancelled_at")
    public Instant cancelledAt;

    @Column(name = "created_at", nullable = false)
    public Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    public Instant updatedAt;

    @PrePersist
    public void prePersist() {
        if (id == null) id = UUID.randomUUID();
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
        if (status == null) status = "ACTIVE";
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = Instant.now();
    }

    public static Uni<SubscriptionEntity> findActiveByUserId(Long userId) {
        return find("userId = ?1 AND status = 'ACTIVE'", userId).firstResult();
    }
}
