package cz.samofujera.catalog.internal;

import org.jooq.DSLContext;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static cz.samofujera.generated.jooq.Tables.VARIANT_PRICES;

@Repository
public class VariantPriceRepository {

    private final DSLContext dsl;

    VariantPriceRepository(DSLContext dsl) {
        this.dsl = dsl;
    }

    public Map<String, BigDecimal> findByVariantId(UUID variantId) {
        var map = new LinkedHashMap<String, BigDecimal>();
        dsl.select(VARIANT_PRICES.CURRENCY, VARIANT_PRICES.AMOUNT)
            .from(VARIANT_PRICES)
            .where(VARIANT_PRICES.VARIANT_ID.eq(variantId))
            .fetch()
            .forEach(r -> map.put(r.get(VARIANT_PRICES.CURRENCY), r.get(VARIANT_PRICES.AMOUNT)));
        return map;
    }

    public Map<UUID, Map<String, BigDecimal>> findByVariantIds(List<UUID> variantIds) {
        var result = new LinkedHashMap<UUID, Map<String, BigDecimal>>();
        if (variantIds.isEmpty()) return result;

        dsl.select(VARIANT_PRICES.VARIANT_ID, VARIANT_PRICES.CURRENCY, VARIANT_PRICES.AMOUNT)
            .from(VARIANT_PRICES)
            .where(VARIANT_PRICES.VARIANT_ID.in(variantIds))
            .fetch()
            .forEach(r -> result
                .computeIfAbsent(r.get(VARIANT_PRICES.VARIANT_ID), k -> new LinkedHashMap<>())
                .put(r.get(VARIANT_PRICES.CURRENCY), r.get(VARIANT_PRICES.AMOUNT)));
        return result;
    }

    public BigDecimal findByVariantIdAndCurrency(UUID variantId, String currency) {
        return dsl.select(VARIANT_PRICES.AMOUNT)
            .from(VARIANT_PRICES)
            .where(VARIANT_PRICES.VARIANT_ID.eq(variantId))
            .and(VARIANT_PRICES.CURRENCY.eq(currency))
            .fetchOne(VARIANT_PRICES.AMOUNT);
    }

    public void upsert(UUID variantId, String currency, BigDecimal amount) {
        var existing = dsl.select(VARIANT_PRICES.ID)
            .from(VARIANT_PRICES)
            .where(VARIANT_PRICES.VARIANT_ID.eq(variantId))
            .and(VARIANT_PRICES.CURRENCY.eq(currency))
            .fetchOne();

        if (existing != null) {
            dsl.update(VARIANT_PRICES)
                .set(VARIANT_PRICES.AMOUNT, amount)
                .set(VARIANT_PRICES.UPDATED_AT, OffsetDateTime.now())
                .where(VARIANT_PRICES.VARIANT_ID.eq(variantId))
                .and(VARIANT_PRICES.CURRENCY.eq(currency))
                .execute();
        } else {
            dsl.insertInto(VARIANT_PRICES)
                .set(VARIANT_PRICES.VARIANT_ID, variantId)
                .set(VARIANT_PRICES.CURRENCY, currency)
                .set(VARIANT_PRICES.AMOUNT, amount)
                .execute();
        }
    }

    public void deleteByVariantId(UUID variantId) {
        dsl.deleteFrom(VARIANT_PRICES)
            .where(VARIANT_PRICES.VARIANT_ID.eq(variantId))
            .execute();
    }
}
