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
@Table(name = "event_occurrences")
public class EventOccurrenceEntity extends PanacheEntityBase {

    @Id
    @Column(columnDefinition = "uuid")
    public UUID id;

    @Column(name = "event_id", nullable = false)
    public UUID eventId;

    @Column(name = "starts_at", nullable = false)
    public Instant startsAt;

    @Column(name = "ends_at")
    public Instant endsAt;

    @Column(nullable = false)
    public String status;

    @Column(name = "stream_url")
    public String streamUrl;

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

    public static Uni<List<EventOccurrenceEntity>> findByEventId(UUID eventId) {
        return list("eventId = ?1 order by startsAt", eventId);
    }
}
