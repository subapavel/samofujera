package cz.samofujera.auth.internal;

import org.jooq.DSLContext;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static cz.samofujera.generated.jooq.Tables.USER_SESSIONS;

@Repository
class SessionRepository {

    private final DSLContext dsl;

    SessionRepository(DSLContext dsl) {
        this.dsl = dsl;
    }

    int countByUser(UUID userId) {
        return dsl.fetchCount(USER_SESSIONS, USER_SESSIONS.USER_ID.eq(userId));
    }

    List<SessionInfo> findByUser(UUID userId) {
        return dsl.selectFrom(USER_SESSIONS)
            .where(USER_SESSIONS.USER_ID.eq(userId))
            .orderBy(USER_SESSIONS.LAST_ACTIVE_AT.desc())
            .fetch(r -> new SessionInfo(
                r.getSessionId(),
                r.getDeviceName(),
                r.getIpAddress(),
                r.getLastActiveAt(),
                r.getCreatedAt()
            ));
    }

    void create(String sessionId, UUID userId, String fingerprint,
                String deviceName, String ipAddress) {
        dsl.insertInto(USER_SESSIONS)
            .set(USER_SESSIONS.SESSION_ID, sessionId)
            .set(USER_SESSIONS.USER_ID, userId)
            .set(USER_SESSIONS.DEVICE_FINGERPRINT, fingerprint)
            .set(USER_SESSIONS.DEVICE_NAME, deviceName)
            .set(USER_SESSIONS.IP_ADDRESS, ipAddress)
            .execute();
    }

    void delete(String sessionId) {
        dsl.deleteFrom(USER_SESSIONS)
            .where(USER_SESSIONS.SESSION_ID.eq(sessionId))
            .execute();
    }

    void deleteAllByUser(UUID userId) {
        dsl.deleteFrom(USER_SESSIONS)
            .where(USER_SESSIONS.USER_ID.eq(userId))
            .execute();
    }

    String findOldestSessionId(UUID userId) {
        return dsl.select(USER_SESSIONS.SESSION_ID)
            .from(USER_SESSIONS)
            .where(USER_SESSIONS.USER_ID.eq(userId))
            .orderBy(USER_SESSIONS.LAST_ACTIVE_AT.asc())
            .limit(1)
            .fetchOne(USER_SESSIONS.SESSION_ID);
    }

    record SessionInfo(
        String sessionId,
        String deviceName,
        String ipAddress,
        LocalDateTime lastActiveAt,
        LocalDateTime createdAt
    ) {}
}
