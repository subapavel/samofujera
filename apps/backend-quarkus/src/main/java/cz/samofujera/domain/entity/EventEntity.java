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
import java.util.UUID;

@Entity
@Table(name = "events")
public class EventEntity extends PanacheEntityBase {

    @Id
    @Column(columnDefinition = "uuid")
    public UUID id;

    @Column(name = "product_id", nullable = false)
    public UUID productId;

    public String venue;

    public Integer capacity;

    @Column(name = "is_online", nullable = false)
    public boolean isOnline;

    @Column(name = "stream_url")
    public String streamUrl;

    @Column(name = "recording_product_id")
    public UUID recordingProductId;

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

    public static Uni<EventEntity> findByProductId(UUID productId) {
        return find("productId", productId).firstResult();
    }
}
