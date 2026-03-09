package cz.samofujera.domain.entity;

import io.quarkus.hibernate.reactive.panache.PanacheEntityBase;
import io.smallrye.mutiny.Uni;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "product_gallery")
public class ProductGalleryEntity extends PanacheEntityBase {

    @Id
    @Column(columnDefinition = "uuid")
    public UUID id;

    @Column(name = "product_id", nullable = false)
    public UUID productId;

    @Column(name = "image_id", nullable = false)
    public UUID imageId;

    @Column(name = "sort_order", nullable = false)
    public int sortOrder;

    @Column(name = "pan_x", nullable = false)
    public int panX;

    @Column(name = "pan_y", nullable = false)
    public int panY;

    @PrePersist
    public void prePersist() {
        if (id == null) id = UUID.randomUUID();
    }

    public static Uni<List<ProductGalleryEntity>> findByProductId(UUID productId) {
        return list("productId = ?1 order by sortOrder", productId);
    }

    public static Uni<Long> deleteByProductIdAndImageId(UUID productId, UUID imageId) {
        return delete("productId = ?1 and imageId = ?2", productId, imageId);
    }

    public static Uni<Long> deleteByProductId(UUID productId) {
        return delete("productId", productId);
    }
}
