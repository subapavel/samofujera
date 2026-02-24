package cz.samofujera.membership.internal;

import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;
import org.jooq.DSLContext;
import org.jooq.JSONB;
import org.jooq.impl.DSL;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public class PlanRepository {

    private static final org.jooq.Table<?> PLANS = DSL.table("membership_plans");
    private static final org.jooq.Field<UUID> ID = DSL.field(DSL.name("membership_plans", "id"), UUID.class);
    private static final org.jooq.Field<String> NAME = DSL.field(DSL.name("membership_plans", "name"), String.class);
    private static final org.jooq.Field<String> SLUG = DSL.field(DSL.name("membership_plans", "slug"), String.class);
    private static final org.jooq.Field<String> DESCRIPTION = DSL.field(DSL.name("membership_plans", "description"), String.class);
    private static final org.jooq.Field<String> STRIPE_PRICE_ID_CZK = DSL.field(DSL.name("membership_plans", "stripe_price_id_czk"), String.class);
    private static final org.jooq.Field<String> STRIPE_PRICE_ID_EUR = DSL.field(DSL.name("membership_plans", "stripe_price_id_eur"), String.class);
    private static final org.jooq.Field<JSONB> FEATURES = DSL.field(DSL.name("membership_plans", "features"), JSONB.class);
    private static final org.jooq.Field<Integer> SORT_ORDER = DSL.field(DSL.name("membership_plans", "sort_order"), Integer.class);
    private static final org.jooq.Field<Boolean> ACTIVE = DSL.field(DSL.name("membership_plans", "active"), Boolean.class);
    private static final org.jooq.Field<OffsetDateTime> CREATED_AT = DSL.field(DSL.name("membership_plans", "created_at"), OffsetDateTime.class);
    private static final org.jooq.Field<OffsetDateTime> UPDATED_AT = DSL.field(DSL.name("membership_plans", "updated_at"), OffsetDateTime.class);

    private final DSLContext dsl;
    private final ObjectMapper objectMapper;

    PlanRepository(DSLContext dsl, ObjectMapper objectMapper) {
        this.dsl = dsl;
        this.objectMapper = objectMapper;
    }

    public record PlanRow(
        UUID id,
        String name,
        String slug,
        String description,
        String stripePriceIdCzk,
        String stripePriceIdEur,
        Object features,
        int sortOrder,
        boolean active,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
    ) {}

    public List<PlanRow> findAll() {
        return dsl.select()
            .from(PLANS)
            .orderBy(SORT_ORDER.asc())
            .fetch(r -> mapRow(r));
    }

    public PlanRow findById(UUID id) {
        return dsl.select()
            .from(PLANS)
            .where(ID.eq(id))
            .fetchOne(r -> mapRow(r));
    }

    public PlanRow findBySlug(String slug) {
        return dsl.select()
            .from(PLANS)
            .where(SLUG.eq(slug))
            .fetchOne(r -> mapRow(r));
    }

    public UUID create(String name, String slug, String description,
                       String stripePriceIdCzk, String stripePriceIdEur,
                       Object features, int sortOrder) {
        return dsl.insertInto(PLANS)
            .set(NAME, name)
            .set(SLUG, slug)
            .set(DESCRIPTION, description)
            .set(STRIPE_PRICE_ID_CZK, stripePriceIdCzk)
            .set(STRIPE_PRICE_ID_EUR, stripePriceIdEur)
            .set(FEATURES, toJsonb(features))
            .set(SORT_ORDER, sortOrder)
            .returning(ID)
            .fetchOne(ID);
    }

    public void update(UUID id, String name, String description,
                       String stripePriceIdCzk, String stripePriceIdEur,
                       Object features, Integer sortOrder, Boolean active) {
        var step = dsl.update(PLANS)
            .set(UPDATED_AT, OffsetDateTime.now());

        if (name != null) step = step.set(NAME, name);
        if (description != null) step = step.set(DESCRIPTION, description);
        if (stripePriceIdCzk != null) step = step.set(STRIPE_PRICE_ID_CZK, stripePriceIdCzk);
        if (stripePriceIdEur != null) step = step.set(STRIPE_PRICE_ID_EUR, stripePriceIdEur);
        if (features != null) step = step.set(FEATURES, toJsonb(features));
        if (sortOrder != null) step = step.set(SORT_ORDER, sortOrder);
        if (active != null) step = step.set(ACTIVE, active);

        step.where(ID.eq(id)).execute();
    }

    private PlanRow mapRow(org.jooq.Record r) {
        var featuresJsonb = r.get(FEATURES);
        Object features = null;
        if (featuresJsonb != null) {
            try {
                features = objectMapper.readValue(featuresJsonb.data(), Object.class);
            } catch (JacksonException e) {
                features = featuresJsonb.data();
            }
        }
        return new PlanRow(
            r.get(ID),
            r.get(NAME),
            r.get(SLUG),
            r.get(DESCRIPTION),
            r.get(STRIPE_PRICE_ID_CZK),
            r.get(STRIPE_PRICE_ID_EUR),
            features,
            r.get(SORT_ORDER),
            r.get(ACTIVE),
            r.get(CREATED_AT),
            r.get(UPDATED_AT)
        );
    }

    private JSONB toJsonb(Object value) {
        if (value == null) return JSONB.jsonb("{}");
        try {
            return JSONB.jsonb(objectMapper.writeValueAsString(value));
        } catch (JacksonException e) {
            throw new RuntimeException("Failed to serialize features to JSON", e);
        }
    }
}
