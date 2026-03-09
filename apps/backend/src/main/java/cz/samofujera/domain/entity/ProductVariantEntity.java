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
@Table(name = "product_variants")
public class ProductVariantEntity extends PanacheEntityBase {

    @Id
    @Column(columnDefinition = "uuid")
    public UUID id;

    @Column(name = "product_id", nullable = false)
    public UUID productId;

    @Column(nullable = false)
    public String name;

    public String sku;

    @Column(nullable = false)
    public int stock;

    @Column(name = "sort_order", nullable = false)
    public int sortOrder;

    @Column(nullable = false)
    public String availability;

    @Column(name = "weight_kg")
    public BigDecimal weightKg;

    @Column(nullable = false)
    public boolean hidden;

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

    public static Uni<List<ProductVariantEntity>> findByProductId(UUID productId) {
        return list("productId = ?1 order by sortOrder", productId);
    }

    public static Uni<Long> deleteByProductId(UUID productId) {
        return delete("productId", productId);
    }
}
