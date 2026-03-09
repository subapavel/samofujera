package cz.samofujera.domain.entity;

import io.quarkus.hibernate.reactive.panache.PanacheEntityBase;
import io.smallrye.mutiny.Uni;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "orders", schema = "quarkus_poc")
public class OrderEntity extends PanacheEntityBase {

    @Id
    @Column(columnDefinition = "uuid")
    public UUID id;

    @Column(name = "user_id")
    public Long userId;

    @Column(nullable = false)
    public String status;

    @Column(name = "total_amount", nullable = false)
    public BigDecimal totalAmount;

    @Column(nullable = false)
    public String currency;

    @Column(name = "discount_amount")
    public BigDecimal discountAmount;

    @Column(name = "stripe_payment_id")
    public String stripePaymentId;

    @Column(name = "billing_address")
    public String billingAddress;

    @Column(name = "shipping_address")
    public String shippingAddress;

    @Column(nullable = false)
    public String locale;

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
        if (status == null) status = "PENDING";
        if (currency == null) currency = "CZK";
        if (locale == null) locale = "cs";
        if (discountAmount == null) discountAmount = BigDecimal.ZERO;
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = Instant.now();
    }

    public static Uni<List<OrderEntity>> findByUserId(Long userId) {
        return list("userId", userId);
    }

    public static Uni<List<OrderEntity>> findByStatus(String status) {
        return list("status", status);
    }
}
