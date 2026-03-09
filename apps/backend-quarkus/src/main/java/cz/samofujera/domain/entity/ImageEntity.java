package cz.samofujera.domain.entity;

import io.quarkus.hibernate.reactive.panache.PanacheEntityBase;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "images", schema = "quarkus_poc")
public class ImageEntity extends PanacheEntityBase {

    @Id
    @Column(columnDefinition = "uuid")
    public UUID id;

    @Column(name = "original_filename")
    public String originalFilename;

    @Column(name = "storage_key")
    public String storageKey;

    @Column(name = "mime_type")
    public String mimeType;

    @Column(name = "file_size_bytes")
    public Long fileSizeBytes;

    @Column(name = "alt_text")
    public String altText;

    public String title;

    @Column(nullable = false)
    public String source;

    public Integer width;

    public Integer height;

    @Column(name = "is_public", nullable = false)
    public boolean isPublic;

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
}
