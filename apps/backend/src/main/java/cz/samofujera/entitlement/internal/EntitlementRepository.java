package cz.samofujera.entitlement.internal;

import org.jooq.DSLContext;
import org.jooq.impl.DSL;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import static cz.samofujera.generated.jooq.Tables.ENTITLEMENTS;

@Repository
public class EntitlementRepository {

    private final DSLContext dsl;

    EntitlementRepository(DSLContext dsl) {
        this.dsl = dsl;
    }

    public record EntitlementRow(
        UUID id,
        UUID userId,
        UUID productId,
        String sourceType,
        UUID sourceId,
        OffsetDateTime grantedAt,
        OffsetDateTime expiresAt
    ) {}

    public UUID grant(UUID userId, UUID productId, String sourceType, UUID sourceId) {
        return dsl.insertInto(ENTITLEMENTS)
            .set(ENTITLEMENTS.USER_ID, userId)
            .set(ENTITLEMENTS.PRODUCT_ID, productId)
            .set(ENTITLEMENTS.SOURCE_TYPE, sourceType)
            .set(ENTITLEMENTS.SOURCE_ID, sourceId)
            .returning(ENTITLEMENTS.ID)
            .fetchOne()
            .getId();
    }

    public boolean hasAccess(UUID userId, UUID productId) {
        return dsl.fetchExists(
            dsl.selectOne()
                .from(ENTITLEMENTS)
                .where(ENTITLEMENTS.USER_ID.eq(userId))
                .and(ENTITLEMENTS.PRODUCT_ID.eq(productId))
                .and(ENTITLEMENTS.REVOKED_AT.isNull())
                .and(ENTITLEMENTS.EXPIRES_AT.isNull()
                    .or(ENTITLEMENTS.EXPIRES_AT.gt(DSL.currentOffsetDateTime())))
        );
    }

    public List<EntitlementRow> findByUserId(UUID userId) {
        return dsl.select(
                ENTITLEMENTS.ID, ENTITLEMENTS.USER_ID, ENTITLEMENTS.PRODUCT_ID,
                ENTITLEMENTS.SOURCE_TYPE, ENTITLEMENTS.SOURCE_ID,
                ENTITLEMENTS.GRANTED_AT, ENTITLEMENTS.EXPIRES_AT)
            .from(ENTITLEMENTS)
            .where(ENTITLEMENTS.USER_ID.eq(userId))
            .and(ENTITLEMENTS.REVOKED_AT.isNull())
            .and(ENTITLEMENTS.EXPIRES_AT.isNull()
                .or(ENTITLEMENTS.EXPIRES_AT.gt(DSL.currentOffsetDateTime())))
            .orderBy(ENTITLEMENTS.GRANTED_AT.desc())
            .fetch(r -> new EntitlementRow(
                r.get(ENTITLEMENTS.ID),
                r.get(ENTITLEMENTS.USER_ID),
                r.get(ENTITLEMENTS.PRODUCT_ID),
                r.get(ENTITLEMENTS.SOURCE_TYPE),
                r.get(ENTITLEMENTS.SOURCE_ID),
                r.get(ENTITLEMENTS.GRANTED_AT),
                r.get(ENTITLEMENTS.EXPIRES_AT)
            ));
    }

    public void revoke(UUID userId, UUID productId) {
        dsl.update(ENTITLEMENTS)
            .set(ENTITLEMENTS.REVOKED_AT, OffsetDateTime.now())
            .where(ENTITLEMENTS.USER_ID.eq(userId))
            .and(ENTITLEMENTS.PRODUCT_ID.eq(productId))
            .and(ENTITLEMENTS.REVOKED_AT.isNull())
            .execute();
    }
}
