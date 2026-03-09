package cz.samofujera.domain.entity;

import io.quarkus.hibernate.reactive.panache.PanacheEntityBase;
import io.smallrye.mutiny.Uni;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "shipping_records", schema = "quarkus_poc")
public class ShippingRecordEntity extends PanacheEntityBase {

    @Id
    @Column(columnDefinition = "uuid")
    public UUID id;

    @Column(name = "order_id", nullable = false)
    public UUID orderId;

    public String carrier;

    @Column(name = "tracking_number")
    public String trackingNumber;

    @Column(name = "tracking_url")
    public String trackingUrl;

    @Column(name = "shipped_at")
    public Instant shippedAt;

    @Column(name = "delivered_at")
    public Instant deliveredAt;

    @Column(name = "created_at", nullable = false)
    public Instant createdAt;

    @PrePersist
    public void prePersist() {
        if (id == null) id = UUID.randomUUID();
        if (createdAt == null) createdAt = Instant.now();
    }

    public static Uni<ShippingRecordEntity> findByOrderId(UUID orderId) {
        return find("orderId", orderId).firstResult();
    }
}
