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
@Table(name = "products")
public class ProductEntity extends PanacheEntityBase {

    @Id
    @Column(columnDefinition = "uuid")
    public UUID id;

    @Column(nullable = false)
    public String title;

    @Column(nullable = false, unique = true)
    public String slug;

    @Column(columnDefinition = "text")
    public String description;

    @Column(name = "short_description")
    public String shortDescription;

    @Column(name = "product_type", nullable = false)
    public String productType;

    @Column(nullable = false)
    public String status;

    @Column(name = "thumbnail_url", columnDefinition = "text")
    public String thumbnailUrl;

    @Column(name = "meta_title")
    public String metaTitle;

    @Column(name = "meta_description")
    public String metaDescription;

    public String sku;

    public String badge;

    @Column(name = "compare_price_czk")
    public BigDecimal comparePriceCzk;

    @Column(name = "compare_price_eur")
    public BigDecimal comparePriceEur;

    @Column(nullable = false)
    public String availability;

    @Column(name = "stock_limit")
    public Integer stockLimit;

    @Column(name = "weight_kg")
    public BigDecimal weightKg;

    @Column(name = "og_image_url", columnDefinition = "text")
    public String ogImageUrl;

    @Column(name = "variant_category_name")
    public String variantCategoryName;

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

    public static Uni<ProductEntity> findBySlug(String slug) {
        return find("slug", slug).firstResult();
    }

    public static Uni<List<ProductEntity>> findByStatus(String status) {
        return list("status", status);
    }

    public static Uni<List<ProductEntity>> findByProductType(String productType) {
        return list("productType", productType);
    }
}
