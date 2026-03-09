package cz.samofujera.domain.entity;

import io.quarkus.hibernate.reactive.panache.PanacheEntityBase;
import io.smallrye.mutiny.Uni;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;

import java.io.Serializable;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "product_category_assignments", schema = "quarkus_poc")
@IdClass(ProductCategoryAssignmentEntity.PK.class)
public class ProductCategoryAssignmentEntity extends PanacheEntityBase {

    @Id
    @Column(name = "product_id", columnDefinition = "uuid")
    public UUID productId;

    @Id
    @Column(name = "category_id", columnDefinition = "uuid")
    public UUID categoryId;

    public static Uni<List<ProductCategoryAssignmentEntity>> findByProductId(UUID productId) {
        return list("productId", productId);
    }

    public static Uni<List<ProductCategoryAssignmentEntity>> findByCategoryId(UUID categoryId) {
        return list("categoryId", categoryId);
    }

    public static Uni<Long> deleteByProductId(UUID productId) {
        return delete("productId", productId);
    }

    public static class PK implements Serializable {
        public UUID productId;
        public UUID categoryId;

        public PK() {}

        public PK(UUID productId, UUID categoryId) {
            this.productId = productId;
            this.categoryId = categoryId;
        }

        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (!(o instanceof PK pk)) return false;
            return Objects.equals(productId, pk.productId) && Objects.equals(categoryId, pk.categoryId);
        }

        @Override
        public int hashCode() {
            return Objects.hash(productId, categoryId);
        }
    }
}
