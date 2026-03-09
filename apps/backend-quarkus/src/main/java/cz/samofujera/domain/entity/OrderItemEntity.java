package cz.samofujera.domain.entity;

import io.quarkus.hibernate.reactive.panache.PanacheEntityBase;
import io.smallrye.mutiny.Uni;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "order_items")
public class OrderItemEntity extends PanacheEntityBase {

    @Id
    @Column(columnDefinition = "uuid")
    public UUID id;

    @Column(name = "order_id", nullable = false)
    public UUID orderId;

    @Column(name = "product_id")
    public UUID productId;

    @Column(name = "variant_id")
    public UUID variantId;

    @Column(nullable = false)
    public int quantity;

    @Column(name = "unit_price", nullable = false)
    public BigDecimal unitPrice;

    @Column(name = "total_price", nullable = false)
    public BigDecimal totalPrice;

    @Column(name = "product_snapshot")
    public String productSnapshot;

    @Column(name = "created_at", nullable = false)
    public Instant createdAt;

    @PrePersist
    public void prePersist() {
        if (id == null) id = UUID.randomUUID();
        if (createdAt == null) createdAt = Instant.now();
    }

    public static Uni<List<OrderItemEntity>> findByOrderId(UUID orderId) {
        return list("orderId", orderId);
    }
}
