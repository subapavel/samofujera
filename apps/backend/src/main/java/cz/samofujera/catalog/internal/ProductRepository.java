package cz.samofujera.catalog.internal;

import org.jooq.Condition;
import org.jooq.DSLContext;
import org.jooq.impl.DSL;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static cz.samofujera.generated.jooq.Tables.CATEGORIES;
import static cz.samofujera.generated.jooq.Tables.PRODUCTS;

@Repository
public class ProductRepository {

    private final DSLContext dsl;

    ProductRepository(DSLContext dsl) {
        this.dsl = dsl;
    }

    public record ProductRow(
        UUID id,
        String title,
        String slug,
        String description,
        String shortDescription,
        String productType,
        String status,
        String thumbnailUrl,
        UUID categoryId,
        String categoryName,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
    ) {}

    public List<ProductRow> findAll(String status, UUID categoryId, String productType,
                                    String search, int offset, int limit) {
        var condition = buildCondition(status, categoryId, productType, search);

        return dsl.select(
                PRODUCTS.ID, PRODUCTS.TITLE, PRODUCTS.SLUG, PRODUCTS.DESCRIPTION,
                PRODUCTS.SHORT_DESCRIPTION, PRODUCTS.PRODUCT_TYPE,
                PRODUCTS.STATUS, PRODUCTS.THUMBNAIL_URL,
                PRODUCTS.CATEGORY_ID, CATEGORIES.NAME,
                PRODUCTS.CREATED_AT, PRODUCTS.UPDATED_AT)
            .from(PRODUCTS)
            .leftJoin(CATEGORIES).on(PRODUCTS.CATEGORY_ID.eq(CATEGORIES.ID))
            .where(condition)
            .orderBy(PRODUCTS.CREATED_AT.desc())
            .offset(offset)
            .limit(limit)
            .fetch(r -> new ProductRow(
                r.get(PRODUCTS.ID),
                r.get(PRODUCTS.TITLE),
                r.get(PRODUCTS.SLUG),
                r.get(PRODUCTS.DESCRIPTION),
                r.get(PRODUCTS.SHORT_DESCRIPTION),
                r.get(PRODUCTS.PRODUCT_TYPE),
                r.get(PRODUCTS.STATUS),
                r.get(PRODUCTS.THUMBNAIL_URL),
                r.get(PRODUCTS.CATEGORY_ID),
                r.get(CATEGORIES.NAME),
                r.get(PRODUCTS.CREATED_AT),
                r.get(PRODUCTS.UPDATED_AT)
            ));
    }

    public long count(String status, UUID categoryId, String productType, String search) {
        var condition = buildCondition(status, categoryId, productType, search);

        return dsl.selectCount()
            .from(PRODUCTS)
            .where(condition)
            .fetchOne(0, long.class);
    }

    public Optional<ProductRow> findById(UUID id) {
        return dsl.select(
                PRODUCTS.ID, PRODUCTS.TITLE, PRODUCTS.SLUG, PRODUCTS.DESCRIPTION,
                PRODUCTS.SHORT_DESCRIPTION, PRODUCTS.PRODUCT_TYPE,
                PRODUCTS.STATUS, PRODUCTS.THUMBNAIL_URL,
                PRODUCTS.CATEGORY_ID, CATEGORIES.NAME,
                PRODUCTS.CREATED_AT, PRODUCTS.UPDATED_AT)
            .from(PRODUCTS)
            .leftJoin(CATEGORIES).on(PRODUCTS.CATEGORY_ID.eq(CATEGORIES.ID))
            .where(PRODUCTS.ID.eq(id))
            .fetchOptional(r -> new ProductRow(
                r.get(PRODUCTS.ID),
                r.get(PRODUCTS.TITLE),
                r.get(PRODUCTS.SLUG),
                r.get(PRODUCTS.DESCRIPTION),
                r.get(PRODUCTS.SHORT_DESCRIPTION),
                r.get(PRODUCTS.PRODUCT_TYPE),
                r.get(PRODUCTS.STATUS),
                r.get(PRODUCTS.THUMBNAIL_URL),
                r.get(PRODUCTS.CATEGORY_ID),
                r.get(CATEGORIES.NAME),
                r.get(PRODUCTS.CREATED_AT),
                r.get(PRODUCTS.UPDATED_AT)
            ));
    }

    public Optional<ProductRow> findBySlug(String slug) {
        return dsl.select(
                PRODUCTS.ID, PRODUCTS.TITLE, PRODUCTS.SLUG, PRODUCTS.DESCRIPTION,
                PRODUCTS.SHORT_DESCRIPTION, PRODUCTS.PRODUCT_TYPE,
                PRODUCTS.STATUS, PRODUCTS.THUMBNAIL_URL,
                PRODUCTS.CATEGORY_ID, CATEGORIES.NAME,
                PRODUCTS.CREATED_AT, PRODUCTS.UPDATED_AT)
            .from(PRODUCTS)
            .leftJoin(CATEGORIES).on(PRODUCTS.CATEGORY_ID.eq(CATEGORIES.ID))
            .where(PRODUCTS.SLUG.eq(slug))
            .fetchOptional(r -> new ProductRow(
                r.get(PRODUCTS.ID),
                r.get(PRODUCTS.TITLE),
                r.get(PRODUCTS.SLUG),
                r.get(PRODUCTS.DESCRIPTION),
                r.get(PRODUCTS.SHORT_DESCRIPTION),
                r.get(PRODUCTS.PRODUCT_TYPE),
                r.get(PRODUCTS.STATUS),
                r.get(PRODUCTS.THUMBNAIL_URL),
                r.get(PRODUCTS.CATEGORY_ID),
                r.get(CATEGORIES.NAME),
                r.get(PRODUCTS.CREATED_AT),
                r.get(PRODUCTS.UPDATED_AT)
            ));
    }

    public UUID create(String title, String slug, String description, String shortDescription,
                       String productType, String thumbnailUrl, UUID categoryId) {
        return dsl.insertInto(PRODUCTS)
            .set(PRODUCTS.TITLE, title)
            .set(PRODUCTS.SLUG, slug)
            .set(PRODUCTS.DESCRIPTION, description)
            .set(PRODUCTS.SHORT_DESCRIPTION, shortDescription)
            .set(PRODUCTS.PRODUCT_TYPE, productType)
            .set(PRODUCTS.THUMBNAIL_URL, thumbnailUrl)
            .set(PRODUCTS.CATEGORY_ID, categoryId)
            .returning(PRODUCTS.ID)
            .fetchOne()
            .getId();
    }

    public void update(UUID id, String title, String slug, String description,
                       String shortDescription, String productType, String status,
                       String thumbnailUrl, UUID categoryId) {
        dsl.update(PRODUCTS)
            .set(PRODUCTS.TITLE, title)
            .set(PRODUCTS.SLUG, slug)
            .set(PRODUCTS.DESCRIPTION, description)
            .set(PRODUCTS.SHORT_DESCRIPTION, shortDescription)
            .set(PRODUCTS.PRODUCT_TYPE, productType)
            .set(PRODUCTS.STATUS, status)
            .set(PRODUCTS.THUMBNAIL_URL, thumbnailUrl)
            .set(PRODUCTS.CATEGORY_ID, categoryId)
            .set(PRODUCTS.UPDATED_AT, OffsetDateTime.now())
            .where(PRODUCTS.ID.eq(id))
            .execute();
    }

    public void updateStatus(UUID id, String status) {
        dsl.update(PRODUCTS)
            .set(PRODUCTS.STATUS, status)
            .set(PRODUCTS.UPDATED_AT, OffsetDateTime.now())
            .where(PRODUCTS.ID.eq(id))
            .execute();
    }

    public boolean existsBySlug(String slug) {
        return dsl.fetchExists(
            dsl.selectFrom(PRODUCTS)
               .where(PRODUCTS.SLUG.eq(slug))
        );
    }

    private Condition buildCondition(String status, UUID categoryId, String productType, String search) {
        Condition condition = DSL.trueCondition();
        if (status != null) {
            condition = condition.and(PRODUCTS.STATUS.eq(status));
        }
        if (categoryId != null) {
            condition = condition.and(PRODUCTS.CATEGORY_ID.eq(categoryId));
        }
        if (productType != null) {
            condition = condition.and(PRODUCTS.PRODUCT_TYPE.eq(productType));
        }
        if (search != null && !search.isBlank()) {
            condition = condition.and(
                PRODUCTS.TITLE.containsIgnoreCase(search)
                    .or(PRODUCTS.DESCRIPTION.containsIgnoreCase(search))
            );
        }
        return condition;
    }
}
