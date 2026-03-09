package cz.samofujera.domain.entity;

import io.quarkus.hibernate.reactive.panache.PanacheEntityBase;
import io.smallrye.mutiny.Uni;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "product_prices")
public class ProductPriceEntity extends PanacheEntityBase {

    @Id
    @Column(columnDefinition = "uuid")
    public UUID id;

    @Column(name = "product_id", nullable = false)
    public UUID productId;

    @Column(nullable = false, length = 3)
    public String currency;

    @Column(nullable = false)
    public BigDecimal amount;

    @PrePersist
    public void prePersist() {
        if (id == null) id = UUID.randomUUID();
    }

    public static Uni<List<ProductPriceEntity>> findByProductId(UUID productId) {
        return list("productId", productId);
    }

    public static Uni<Long> deleteByProductId(UUID productId) {
        return delete("productId", productId);
    }
}
