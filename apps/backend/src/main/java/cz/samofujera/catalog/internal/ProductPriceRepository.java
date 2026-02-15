package cz.samofujera.catalog.internal;

import org.jooq.DSLContext;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static cz.samofujera.generated.jooq.Tables.PRODUCT_PRICES;

@Repository
public class ProductPriceRepository {

    private final DSLContext dsl;

    ProductPriceRepository(DSLContext dsl) {
        this.dsl = dsl;
    }

    public record PriceRow(UUID id, UUID productId, String currency, BigDecimal amount) {}

    public Map<String, BigDecimal> findByProductId(UUID productId) {
        var map = new LinkedHashMap<String, BigDecimal>();
        dsl.select(PRODUCT_PRICES.CURRENCY, PRODUCT_PRICES.AMOUNT)
            .from(PRODUCT_PRICES)
            .where(PRODUCT_PRICES.PRODUCT_ID.eq(productId))
            .fetch()
            .forEach(r -> map.put(r.get(PRODUCT_PRICES.CURRENCY), r.get(PRODUCT_PRICES.AMOUNT)));
        return map;
    }

    public Map<UUID, Map<String, BigDecimal>> findByProductIds(List<UUID> productIds) {
        var result = new LinkedHashMap<UUID, Map<String, BigDecimal>>();
        if (productIds.isEmpty()) return result;

        dsl.select(PRODUCT_PRICES.PRODUCT_ID, PRODUCT_PRICES.CURRENCY, PRODUCT_PRICES.AMOUNT)
            .from(PRODUCT_PRICES)
            .where(PRODUCT_PRICES.PRODUCT_ID.in(productIds))
            .fetch()
            .forEach(r -> result
                .computeIfAbsent(r.get(PRODUCT_PRICES.PRODUCT_ID), k -> new LinkedHashMap<>())
                .put(r.get(PRODUCT_PRICES.CURRENCY), r.get(PRODUCT_PRICES.AMOUNT)));
        return result;
    }

    public BigDecimal findByProductIdAndCurrency(UUID productId, String currency) {
        return dsl.select(PRODUCT_PRICES.AMOUNT)
            .from(PRODUCT_PRICES)
            .where(PRODUCT_PRICES.PRODUCT_ID.eq(productId))
            .and(PRODUCT_PRICES.CURRENCY.eq(currency))
            .fetchOne(PRODUCT_PRICES.AMOUNT);
    }

    public void upsert(UUID productId, String currency, BigDecimal amount) {
        var existing = dsl.select(PRODUCT_PRICES.ID)
            .from(PRODUCT_PRICES)
            .where(PRODUCT_PRICES.PRODUCT_ID.eq(productId))
            .and(PRODUCT_PRICES.CURRENCY.eq(currency))
            .fetchOne();

        if (existing != null) {
            dsl.update(PRODUCT_PRICES)
                .set(PRODUCT_PRICES.AMOUNT, amount)
                .set(PRODUCT_PRICES.UPDATED_AT, OffsetDateTime.now())
                .where(PRODUCT_PRICES.PRODUCT_ID.eq(productId))
                .and(PRODUCT_PRICES.CURRENCY.eq(currency))
                .execute();
        } else {
            dsl.insertInto(PRODUCT_PRICES)
                .set(PRODUCT_PRICES.PRODUCT_ID, productId)
                .set(PRODUCT_PRICES.CURRENCY, currency)
                .set(PRODUCT_PRICES.AMOUNT, amount)
                .execute();
        }
    }

    public void deleteByProductId(UUID productId) {
        dsl.deleteFrom(PRODUCT_PRICES)
            .where(PRODUCT_PRICES.PRODUCT_ID.eq(productId))
            .execute();
    }
}
