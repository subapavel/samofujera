package cz.samofujera.catalog.internal;

import org.jooq.DSLContext;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static cz.samofujera.generated.jooq.Tables.PRODUCT_VARIANTS;

@Repository
public class ProductVariantRepository {

    private final DSLContext dsl;

    ProductVariantRepository(DSLContext dsl) {
        this.dsl = dsl;
    }

    public record VariantRow(
        UUID id, UUID productId, String name, String sku, int stock, int sortOrder,
        OffsetDateTime createdAt, OffsetDateTime updatedAt
    ) {}

    public List<VariantRow> findByProductId(UUID productId) {
        return dsl.select(
                PRODUCT_VARIANTS.ID, PRODUCT_VARIANTS.PRODUCT_ID, PRODUCT_VARIANTS.NAME,
                PRODUCT_VARIANTS.SKU, PRODUCT_VARIANTS.STOCK, PRODUCT_VARIANTS.SORT_ORDER,
                PRODUCT_VARIANTS.CREATED_AT, PRODUCT_VARIANTS.UPDATED_AT)
            .from(PRODUCT_VARIANTS)
            .where(PRODUCT_VARIANTS.PRODUCT_ID.eq(productId))
            .orderBy(PRODUCT_VARIANTS.SORT_ORDER.asc())
            .fetch(r -> new VariantRow(
                r.get(PRODUCT_VARIANTS.ID),
                r.get(PRODUCT_VARIANTS.PRODUCT_ID),
                r.get(PRODUCT_VARIANTS.NAME),
                r.get(PRODUCT_VARIANTS.SKU),
                r.get(PRODUCT_VARIANTS.STOCK),
                r.get(PRODUCT_VARIANTS.SORT_ORDER),
                r.get(PRODUCT_VARIANTS.CREATED_AT),
                r.get(PRODUCT_VARIANTS.UPDATED_AT)
            ));
    }

    public Optional<VariantRow> findById(UUID id) {
        return dsl.select(
                PRODUCT_VARIANTS.ID, PRODUCT_VARIANTS.PRODUCT_ID, PRODUCT_VARIANTS.NAME,
                PRODUCT_VARIANTS.SKU, PRODUCT_VARIANTS.STOCK, PRODUCT_VARIANTS.SORT_ORDER,
                PRODUCT_VARIANTS.CREATED_AT, PRODUCT_VARIANTS.UPDATED_AT)
            .from(PRODUCT_VARIANTS)
            .where(PRODUCT_VARIANTS.ID.eq(id))
            .fetchOptional(r -> new VariantRow(
                r.get(PRODUCT_VARIANTS.ID),
                r.get(PRODUCT_VARIANTS.PRODUCT_ID),
                r.get(PRODUCT_VARIANTS.NAME),
                r.get(PRODUCT_VARIANTS.SKU),
                r.get(PRODUCT_VARIANTS.STOCK),
                r.get(PRODUCT_VARIANTS.SORT_ORDER),
                r.get(PRODUCT_VARIANTS.CREATED_AT),
                r.get(PRODUCT_VARIANTS.UPDATED_AT)
            ));
    }

    public UUID create(UUID productId, String name, String sku, int stock, int sortOrder) {
        return dsl.insertInto(PRODUCT_VARIANTS)
            .set(PRODUCT_VARIANTS.PRODUCT_ID, productId)
            .set(PRODUCT_VARIANTS.NAME, name)
            .set(PRODUCT_VARIANTS.SKU, sku)
            .set(PRODUCT_VARIANTS.STOCK, stock)
            .set(PRODUCT_VARIANTS.SORT_ORDER, sortOrder)
            .returning(PRODUCT_VARIANTS.ID)
            .fetchOne()
            .getId();
    }

    public void update(UUID id, String name, String sku, int stock, int sortOrder) {
        dsl.update(PRODUCT_VARIANTS)
            .set(PRODUCT_VARIANTS.NAME, name)
            .set(PRODUCT_VARIANTS.SKU, sku)
            .set(PRODUCT_VARIANTS.STOCK, stock)
            .set(PRODUCT_VARIANTS.SORT_ORDER, sortOrder)
            .set(PRODUCT_VARIANTS.UPDATED_AT, OffsetDateTime.now())
            .where(PRODUCT_VARIANTS.ID.eq(id))
            .execute();
    }

    public void deleteByProductId(UUID productId) {
        dsl.deleteFrom(PRODUCT_VARIANTS)
            .where(PRODUCT_VARIANTS.PRODUCT_ID.eq(productId))
            .execute();
    }

    public void deleteById(UUID id) {
        dsl.deleteFrom(PRODUCT_VARIANTS)
            .where(PRODUCT_VARIANTS.ID.eq(id))
            .execute();
    }

    public void decrementStock(UUID variantId, int quantity) {
        dsl.update(PRODUCT_VARIANTS)
            .set(PRODUCT_VARIANTS.STOCK, PRODUCT_VARIANTS.STOCK.minus(quantity))
            .set(PRODUCT_VARIANTS.UPDATED_AT, OffsetDateTime.now())
            .where(PRODUCT_VARIANTS.ID.eq(variantId))
            .and(PRODUCT_VARIANTS.STOCK.greaterOrEqual(quantity))
            .execute();
    }
}
