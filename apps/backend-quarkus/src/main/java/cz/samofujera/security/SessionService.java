package cz.samofujera.security;

import cz.samofujera.security.entity.SessionEntity;
import cz.samofujera.security.entity.UserEntity;
import io.quarkus.hibernate.reactive.panache.common.WithSession;
import io.quarkus.hibernate.reactive.panache.common.WithTransaction;
import io.smallrye.mutiny.Uni;
import io.vertx.ext.web.RoutingContext;
import jakarta.enterprise.context.ApplicationScoped;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;

@ApplicationScoped
public class SessionService {

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final Base64.Encoder ENCODER = Base64.getUrlEncoder().withoutPadding();

    @ConfigProperty(name = "app.session.timeout", defaultValue = "PT24H")
    Duration sessionTimeout;

    private String generateSessionId() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return ENCODER.encodeToString(bytes);
    }

    @WithSession
    public Uni<SessionEntity> findValidSession(String sessionId) {
        return SessionEntity.find(
                "FROM SessionEntity s JOIN FETCH s.user WHERE s.id = ?1 AND s.expiresAt > ?2",
                sessionId, Instant.now()
        ).firstResult();
    }

    /**
     * Creates a session within the caller's existing transaction.
     * Use this from endpoints that already have @WithTransaction.
     */
    public Uni<SessionEntity> createSessionInline(UserEntity user, RoutingContext context) {
        var session = new SessionEntity();
        session.id = generateSessionId();
        session.user = user;
        session.createdAt = Instant.now();
        session.expiresAt = Instant.now().plus(sessionTimeout);
        session.lastAccessedAt = Instant.now();
        session.ipAddress = context.request().remoteAddress() != null
                ? context.request().remoteAddress().host() : null;
        session.userAgent = context.request().getHeader("User-Agent");
        return session.persist();
    }

    @WithTransaction
    public Uni<Void> deleteSession(String sessionId) {
        return SessionEntity.deleteById(sessionId).replaceWithVoid();
    }

    /**
     * Static method for use where caller manages the transaction.
     */
    public static Uni<Void> deleteSessionDirect(String sessionId) {
        return SessionEntity.deleteById(sessionId).replaceWithVoid();
    }

    @WithTransaction
    public Uni<Void> deleteExpiredSessions() {
        return SessionEntity.deleteExpired().replaceWithVoid();
    }

    @WithTransaction
    public Uni<SessionEntity> touchSession(SessionEntity session) {
        // Reattach and update in its own transaction
        return SessionEntity.<SessionEntity>findById(session.id)
                .onItem().ifNotNull().transformToUni(s -> {
                    s.lastAccessedAt = Instant.now();
                    s.expiresAt = Instant.now().plus(sessionTimeout);
                    return s.<SessionEntity>persist();
                });
    }

    @WithTransaction
    public Uni<Void> setImpersonation(String sessionId, Long impersonatedUserId) {
        return SessionEntity.<SessionEntity>findById(sessionId)
                .onItem().ifNotNull().transformToUni(session -> {
                    session.impersonatedUserId = impersonatedUserId;
                    return session.<SessionEntity>persist().replaceWithVoid();
                });
    }
}
