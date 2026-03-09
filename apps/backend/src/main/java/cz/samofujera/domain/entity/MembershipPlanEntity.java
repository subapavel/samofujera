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
import java.util.List;
import java.util.UUID;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "membership_plans")
public class MembershipPlanEntity extends PanacheEntityBase {

    @Id
    @Column(columnDefinition = "uuid")
    public UUID id;

    @Column(nullable = false)
    public String name;

    @Column(nullable = false, unique = true)
    public String slug;

    @Column(columnDefinition = "text")
    public String description;

    @Column(name = "stripe_price_id_czk")
    public String stripePriceIdCzk;

    @Column(name = "stripe_price_id_eur")
    public String stripePriceIdEur;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false, columnDefinition = "jsonb")
    public String features;

    @Column(name = "sort_order", nullable = false)
    public int sortOrder;

    @Column(nullable = false)
    public boolean active;

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
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = Instant.now();
    }

    public static Uni<MembershipPlanEntity> findBySlug(String slug) {
        return find("slug", slug).firstResult();
    }

    public static Uni<List<MembershipPlanEntity>> findActivePlans() {
        return list("active = true order by sortOrder");
    }
}
