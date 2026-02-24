package cz.samofujera.membership.internal;

import org.jooq.DSLContext;
import org.jooq.impl.DSL;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public class SubscriptionRepository {

    private static final org.jooq.Table<?> SUBSCRIPTIONS = DSL.table("subscriptions");
    private static final org.jooq.Field<UUID> ID = DSL.field(DSL.name("subscriptions", "id"), UUID.class);
    private static final org.jooq.Field<UUID> USER_ID = DSL.field(DSL.name("subscriptions", "user_id"), UUID.class);
    private static final org.jooq.Field<UUID> PLAN_ID = DSL.field(DSL.name("subscriptions", "plan_id"), UUID.class);
    private static final org.jooq.Field<String> STRIPE_SUBSCRIPTION_ID = DSL.field(DSL.name("subscriptions", "stripe_subscription_id"), String.class);
    private static final org.jooq.Field<String> STATUS = DSL.field(DSL.name("subscriptions", "status"), String.class);
    private static final org.jooq.Field<OffsetDateTime> CURRENT_PERIOD_START = DSL.field(DSL.name("subscriptions", "current_period_start"), OffsetDateTime.class);
    private static final org.jooq.Field<OffsetDateTime> CURRENT_PERIOD_END = DSL.field(DSL.name("subscriptions", "current_period_end"), OffsetDateTime.class);
    private static final org.jooq.Field<OffsetDateTime> CANCELLED_AT = DSL.field(DSL.name("subscriptions", "cancelled_at"), OffsetDateTime.class);
    private static final org.jooq.Field<OffsetDateTime> CREATED_AT = DSL.field(DSL.name("subscriptions", "created_at"), OffsetDateTime.class);
    private static final org.jooq.Field<OffsetDateTime> UPDATED_AT = DSL.field(DSL.name("subscriptions", "updated_at"), OffsetDateTime.class);

    private final DSLContext dsl;

    SubscriptionRepository(DSLContext dsl) {
        this.dsl = dsl;
    }

    public record SubscriptionRow(
        UUID id,
        UUID userId,
        UUID planId,
        String stripeSubscriptionId,
        String status,
        OffsetDateTime currentPeriodStart,
        OffsetDateTime currentPeriodEnd,
        OffsetDateTime cancelledAt,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
    ) {}

    public List<SubscriptionRow> findByUserId(UUID userId) {
        return dsl.select()
            .from(SUBSCRIPTIONS)
            .where(USER_ID.eq(userId))
            .orderBy(CREATED_AT.desc())
            .fetch(r -> mapRow(r));
    }

    public SubscriptionRow findActiveByUserId(UUID userId) {
        return dsl.select()
            .from(SUBSCRIPTIONS)
            .where(USER_ID.eq(userId))
            .and(STATUS.eq("ACTIVE"))
            .and(CURRENT_PERIOD_END.greaterThan(OffsetDateTime.now()))
            .fetchOne(r -> mapRow(r));
    }

    public SubscriptionRow findByStripeSubscriptionId(String stripeSubId) {
        return dsl.select()
            .from(SUBSCRIPTIONS)
            .where(STRIPE_SUBSCRIPTION_ID.eq(stripeSubId))
            .fetchOne(r -> mapRow(r));
    }

    public UUID create(UUID userId, UUID planId, String stripeSubscriptionId,
                       String status, OffsetDateTime currentPeriodStart,
                       OffsetDateTime currentPeriodEnd) {
        return dsl.insertInto(SUBSCRIPTIONS)
            .set(USER_ID, userId)
            .set(PLAN_ID, planId)
            .set(STRIPE_SUBSCRIPTION_ID, stripeSubscriptionId)
            .set(STATUS, status)
            .set(CURRENT_PERIOD_START, currentPeriodStart)
            .set(CURRENT_PERIOD_END, currentPeriodEnd)
            .returning(ID)
            .fetchOne(ID);
    }

    public void update(UUID id, String status, OffsetDateTime currentPeriodStart,
                       OffsetDateTime currentPeriodEnd, OffsetDateTime cancelledAt) {
        var step = dsl.update(SUBSCRIPTIONS)
            .set(UPDATED_AT, OffsetDateTime.now());

        if (status != null) step = step.set(STATUS, status);
        if (currentPeriodStart != null) step = step.set(CURRENT_PERIOD_START, currentPeriodStart);
        if (currentPeriodEnd != null) step = step.set(CURRENT_PERIOD_END, currentPeriodEnd);
        if (cancelledAt != null) step = step.set(CANCELLED_AT, cancelledAt);

        step.where(ID.eq(id)).execute();
    }

    private SubscriptionRow mapRow(org.jooq.Record r) {
        return new SubscriptionRow(
            r.get(ID),
            r.get(USER_ID),
            r.get(PLAN_ID),
            r.get(STRIPE_SUBSCRIPTION_ID),
            r.get(STATUS),
            r.get(CURRENT_PERIOD_START),
            r.get(CURRENT_PERIOD_END),
            r.get(CANCELLED_AT),
            r.get(CREATED_AT),
            r.get(UPDATED_AT)
        );
    }
}
