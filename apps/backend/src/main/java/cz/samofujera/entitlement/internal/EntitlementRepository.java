package cz.samofujera.entitlement.internal;

import org.jooq.DSLContext;
import org.jooq.impl.DSL;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public class EntitlementRepository {

    private static final org.jooq.Table<?> ENTITLEMENTS = DSL.table("entitlements");
    private static final org.jooq.Field<UUID> ID = DSL.field("entitlements.id", UUID.class);
    private static final org.jooq.Field<UUID> USER_ID = DSL.field("entitlements.user_id", UUID.class);
    private static final org.jooq.Field<String> ENTITY_TYPE = DSL.field("entitlements.entity_type", String.class);
    private static final org.jooq.Field<UUID> ENTITY_ID = DSL.field("entitlements.entity_id", UUID.class);
    private static final org.jooq.Field<String> SOURCE_TYPE = DSL.field("entitlements.source_type", String.class);
    private static final org.jooq.Field<UUID> SOURCE_ID = DSL.field("entitlements.source_id", UUID.class);
    private static final org.jooq.Field<OffsetDateTime> GRANTED_AT = DSL.field("entitlements.granted_at", OffsetDateTime.class);
    private static final org.jooq.Field<OffsetDateTime> EXPIRES_AT = DSL.field("entitlements.expires_at", OffsetDateTime.class);
    private static final org.jooq.Field<OffsetDateTime> REVOKED_AT = DSL.field("entitlements.revoked_at", OffsetDateTime.class);

    private final DSLContext dsl;

    EntitlementRepository(DSLContext dsl) {
        this.dsl = dsl;
    }

    public record EntitlementRow(
        UUID id, UUID userId, String entityType, UUID entityId,
        String sourceType, UUID sourceId,
        OffsetDateTime grantedAt, OffsetDateTime expiresAt
    ) {}

    public UUID grant(UUID userId, String entityType, UUID entityId,
                      String sourceType, UUID sourceId, OffsetDateTime expiresAt) {
        var insert = dsl.insertInto(ENTITLEMENTS)
            .set(USER_ID, userId)
            .set(ENTITY_TYPE, entityType)
            .set(ENTITY_ID, entityId)
            .set(SOURCE_TYPE, sourceType)
            .set(SOURCE_ID, sourceId);
        if (expiresAt != null) {
            insert = insert.set(EXPIRES_AT, expiresAt);
        }
        return insert.returning(ID).fetchOne().get(ID);
    }

    public boolean hasAccess(UUID userId, String entityType, UUID entityId) {
        return dsl.fetchExists(
            dsl.selectOne()
                .from(ENTITLEMENTS)
                .where(USER_ID.eq(userId))
                .and(ENTITY_TYPE.eq(entityType))
                .and(ENTITY_ID.eq(entityId))
                .and(REVOKED_AT.isNull())
                .and(EXPIRES_AT.isNull()
                    .or(EXPIRES_AT.gt(DSL.currentOffsetDateTime())))
        );
    }

    public List<EntitlementRow> findByUserId(UUID userId) {
        return dsl.select(ID, USER_ID, ENTITY_TYPE, ENTITY_ID, SOURCE_TYPE, SOURCE_ID, GRANTED_AT, EXPIRES_AT)
            .from(ENTITLEMENTS)
            .where(USER_ID.eq(userId))
            .and(REVOKED_AT.isNull())
            .and(EXPIRES_AT.isNull()
                .or(EXPIRES_AT.gt(DSL.currentOffsetDateTime())))
            .orderBy(GRANTED_AT.desc())
            .fetch(r -> new EntitlementRow(
                r.get(ID), r.get(USER_ID), r.get(ENTITY_TYPE), r.get(ENTITY_ID),
                r.get(SOURCE_TYPE), r.get(SOURCE_ID), r.get(GRANTED_AT), r.get(EXPIRES_AT)
            ));
    }

    public List<EntitlementRow> findByUserIdAndEntityType(UUID userId, String entityType) {
        return dsl.select(ID, USER_ID, ENTITY_TYPE, ENTITY_ID, SOURCE_TYPE, SOURCE_ID, GRANTED_AT, EXPIRES_AT)
            .from(ENTITLEMENTS)
            .where(USER_ID.eq(userId))
            .and(ENTITY_TYPE.eq(entityType))
            .and(REVOKED_AT.isNull())
            .and(EXPIRES_AT.isNull()
                .or(EXPIRES_AT.gt(DSL.currentOffsetDateTime())))
            .orderBy(GRANTED_AT.desc())
            .fetch(r -> new EntitlementRow(
                r.get(ID), r.get(USER_ID), r.get(ENTITY_TYPE), r.get(ENTITY_ID),
                r.get(SOURCE_TYPE), r.get(SOURCE_ID), r.get(GRANTED_AT), r.get(EXPIRES_AT)
            ));
    }

    public void revoke(UUID userId, String entityType, UUID entityId) {
        dsl.update(ENTITLEMENTS)
            .set(REVOKED_AT, OffsetDateTime.now())
            .where(USER_ID.eq(userId))
            .and(ENTITY_TYPE.eq(entityType))
            .and(ENTITY_ID.eq(entityId))
            .and(REVOKED_AT.isNull())
            .execute();
    }

    public void revokeById(UUID entitlementId) {
        dsl.update(ENTITLEMENTS)
            .set(REVOKED_AT, OffsetDateTime.now())
            .where(ID.eq(entitlementId))
            .and(REVOKED_AT.isNull())
            .execute();
    }
}
