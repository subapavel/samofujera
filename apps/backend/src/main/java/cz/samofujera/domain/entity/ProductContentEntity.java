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

@Entity
@Table(name = "product_content")
public class ProductContentEntity extends PanacheEntityBase {

    @Id
    @Column(columnDefinition = "uuid")
    public UUID id;

    @Column(name = "product_id", nullable = false)
    public UUID productId;

    @Column(name = "content_type", nullable = false)
    public String contentType;

    public String title;

    @Column(name = "is_preview", nullable = false)
    public boolean isPreview;

    @Column(name = "storage_key")
    public String storageKey;

    @Column(name = "original_filename")
    public String originalFilename;

    @Column(name = "mime_type")
    public String mimeType;

    @Column(name = "file_size_bytes")
    public Long fileSizeBytes;

    @Column(name = "stream_uid")
    public String streamUid;

    @Column(name = "duration_seconds")
    public Integer durationSeconds;

    @Column(name = "sort_order", nullable = false)
    public int sortOrder;

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

    public static Uni<List<ProductContentEntity>> findByProductId(UUID productId) {
        return list("productId = ?1 order by sortOrder", productId);
    }

    public static Uni<Long> deleteByProductId(UUID productId) {
        return delete("productId", productId);
    }
}
