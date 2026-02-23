package cz.samofujera.lead.internal;

import org.jooq.DSLContext;
import org.jooq.impl.DSL;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.UUID;

@Repository
public class LeadCaptureRepository {

    private static final org.jooq.Table<?> LEAD_CAPTURES = DSL.table("lead_captures");
    private static final org.jooq.Field<UUID> ID = DSL.field("id", UUID.class);
    private static final org.jooq.Field<UUID> USER_ID = DSL.field("user_id", UUID.class);
    private static final org.jooq.Field<String> ENTITY_TYPE = DSL.field("entity_type", String.class);
    private static final org.jooq.Field<UUID> ENTITY_ID = DSL.field("entity_id", UUID.class);
    private static final org.jooq.Field<String> EMAIL = DSL.field("email", String.class);
    private static final org.jooq.Field<String> UTM_SOURCE = DSL.field("utm_source", String.class);
    private static final org.jooq.Field<String> UTM_MEDIUM = DSL.field("utm_medium", String.class);
    private static final org.jooq.Field<String> UTM_CAMPAIGN = DSL.field("utm_campaign", String.class);
    private static final org.jooq.Field<String> UTM_CONTENT = DSL.field("utm_content", String.class);
    private static final org.jooq.Field<String> REFERRER_URL = DSL.field("referrer_url", String.class);
    private static final org.jooq.Field<String> IP_ADDRESS = DSL.field("ip_address", String.class);
    private static final org.jooq.Field<OffsetDateTime> CREATED_AT = DSL.field("created_at", OffsetDateTime.class);

    private final DSLContext dsl;

    LeadCaptureRepository(DSLContext dsl) {
        this.dsl = dsl;
    }

    public UUID create(UUID userId, String entityType, UUID entityId, String email,
                       String utmSource, String utmMedium, String utmCampaign,
                       String utmContent, String referrerUrl, String ipAddress) {
        return dsl.insertInto(LEAD_CAPTURES)
            .set(USER_ID, userId)
            .set(ENTITY_TYPE, entityType)
            .set(ENTITY_ID, entityId)
            .set(EMAIL, email)
            .set(UTM_SOURCE, utmSource)
            .set(UTM_MEDIUM, utmMedium)
            .set(UTM_CAMPAIGN, utmCampaign)
            .set(UTM_CONTENT, utmContent)
            .set(REFERRER_URL, referrerUrl)
            .set(IP_ADDRESS, ipAddress)
            .returning(ID)
            .fetchOne(ID);
    }

    public int countByEntityId(String entityType, UUID entityId) {
        return dsl.selectCount()
            .from(LEAD_CAPTURES)
            .where(ENTITY_TYPE.eq(entityType))
            .and(ENTITY_ID.eq(entityId))
            .fetchOne(0, int.class);
    }

    public int countUniqueEmailsByEntityId(String entityType, UUID entityId) {
        return dsl.select(DSL.countDistinct(EMAIL))
            .from(LEAD_CAPTURES)
            .where(ENTITY_TYPE.eq(entityType))
            .and(ENTITY_ID.eq(entityId))
            .fetchOne(0, int.class);
    }

    public boolean existsByEmailAndEntity(String email, String entityType, UUID entityId) {
        return dsl.fetchExists(
            dsl.selectOne()
                .from(LEAD_CAPTURES)
                .where(EMAIL.eq(email))
                .and(ENTITY_TYPE.eq(entityType))
                .and(ENTITY_ID.eq(entityId))
        );
    }

    public record LeadCaptureRow(
        UUID id, UUID userId, String entityType, UUID entityId, String email,
        String utmSource, String utmMedium, String utmCampaign, String utmContent,
        String referrerUrl, String ipAddress, OffsetDateTime createdAt
    ) {}
}
