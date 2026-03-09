package cz.samofujera.security.entity;

import io.quarkus.hibernate.reactive.panache.PanacheEntityBase;
import io.smallrye.mutiny.Uni;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "sessions")
public class SessionEntity extends PanacheEntityBase {

    @Id
    public String id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id", nullable = false)
    public UserEntity user;

    @Column(name = "impersonated_user_id")
    public Long impersonatedUserId;

    @Column(name = "created_at", nullable = false)
    public Instant createdAt;

    @Column(name = "expires_at", nullable = false)
    public Instant expiresAt;

    @Column(name = "last_accessed_at")
    public Instant lastAccessedAt;

    @Column(name = "ip_address")
    public String ipAddress;

    @Column(name = "user_agent")
    public String userAgent;

    public static Uni<SessionEntity> findValidById(String sessionId) {
        return find("id = ?1 AND expiresAt > ?2", sessionId, Instant.now())
                .firstResult();
    }

    public static Uni<Long> deleteExpired() {
        return delete("expiresAt < ?1", Instant.now());
    }

    public static Uni<Long> deleteByUserId(Long userId) {
        return delete("user.id", userId);
    }
}
