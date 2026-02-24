package cz.samofujera.catalog.internal;

import org.jooq.DSLContext;
import org.jooq.Field;
import org.jooq.Table;
import org.jooq.impl.DSL;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public class CategoryRepository {

    // String-based DSL for the renamed column and table
    private static final Table<?> PC = DSL.table("product_categories");
    private static final Field<UUID> PC_ID = DSL.field(DSL.name("product_categories", "id"), UUID.class);
    private static final Field<String> PC_NAME = DSL.field(DSL.name("product_categories", "name"), String.class);
    private static final Field<String> PC_SLUG = DSL.field(DSL.name("product_categories", "slug"), String.class);
    private static final Field<String> PC_DESCRIPTION = DSL.field(DSL.name("product_categories", "description"), String.class);
    private static final Field<UUID> PC_IMAGE_ID = DSL.field(DSL.name("product_categories", "image_id"), UUID.class);
    private static final Field<String> PC_META_TITLE = DSL.field(DSL.name("product_categories", "meta_title"), String.class);
    private static final Field<String> PC_META_DESCRIPTION = DSL.field(DSL.name("product_categories", "meta_description"), String.class);
    private static final Field<Integer> PC_SORT_ORDER = DSL.field(DSL.name("product_categories", "sort_order"), Integer.class);
    private static final Field<OffsetDateTime> PC_CREATED_AT = DSL.field(DSL.name("product_categories", "created_at"), OffsetDateTime.class);
    private static final Field<OffsetDateTime> PC_UPDATED_AT = DSL.field(DSL.name("product_categories", "updated_at"), OffsetDateTime.class);

    private final DSLContext dsl;

    CategoryRepository(DSLContext dsl) {
        this.dsl = dsl;
    }

    public record CategoryRow(
        UUID id,
        String name,
        String slug,
        String description,
        UUID imageId,
        String metaTitle,
        String metaDescription,
        int sortOrder,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
    ) {}

    public List<CategoryRow> findAll() {
        return dsl.select(PC_ID, PC_NAME, PC_SLUG, PC_DESCRIPTION, PC_IMAGE_ID,
                PC_META_TITLE, PC_META_DESCRIPTION, PC_SORT_ORDER, PC_CREATED_AT, PC_UPDATED_AT)
            .from(PC)
            .orderBy(PC_SORT_ORDER.asc(), PC_NAME.asc())
            .fetch(r -> new CategoryRow(
                r.get(PC_ID), r.get(PC_NAME), r.get(PC_SLUG), r.get(PC_DESCRIPTION),
                r.get(PC_IMAGE_ID), r.get(PC_META_TITLE), r.get(PC_META_DESCRIPTION),
                r.get(PC_SORT_ORDER), r.get(PC_CREATED_AT), r.get(PC_UPDATED_AT)
            ));
    }

    public Optional<CategoryRow> findById(UUID id) {
        return dsl.select(PC_ID, PC_NAME, PC_SLUG, PC_DESCRIPTION, PC_IMAGE_ID,
                PC_META_TITLE, PC_META_DESCRIPTION, PC_SORT_ORDER, PC_CREATED_AT, PC_UPDATED_AT)
            .from(PC)
            .where(PC_ID.eq(id))
            .fetchOptional(r -> new CategoryRow(
                r.get(PC_ID), r.get(PC_NAME), r.get(PC_SLUG), r.get(PC_DESCRIPTION),
                r.get(PC_IMAGE_ID), r.get(PC_META_TITLE), r.get(PC_META_DESCRIPTION),
                r.get(PC_SORT_ORDER), r.get(PC_CREATED_AT), r.get(PC_UPDATED_AT)
            ));
    }

    public Optional<CategoryRow> findBySlug(String slug) {
        return dsl.select(PC_ID, PC_NAME, PC_SLUG, PC_DESCRIPTION, PC_IMAGE_ID,
                PC_META_TITLE, PC_META_DESCRIPTION, PC_SORT_ORDER, PC_CREATED_AT, PC_UPDATED_AT)
            .from(PC)
            .where(PC_SLUG.eq(slug))
            .fetchOptional(r -> new CategoryRow(
                r.get(PC_ID), r.get(PC_NAME), r.get(PC_SLUG), r.get(PC_DESCRIPTION),
                r.get(PC_IMAGE_ID), r.get(PC_META_TITLE), r.get(PC_META_DESCRIPTION),
                r.get(PC_SORT_ORDER), r.get(PC_CREATED_AT), r.get(PC_UPDATED_AT)
            ));
    }

    public UUID create(String name, String slug, String description, UUID imageId,
                       String metaTitle, String metaDescription, int sortOrder) {
        return dsl.insertInto(PC)
            .set(PC_NAME, name)
            .set(PC_SLUG, slug)
            .set(PC_DESCRIPTION, description)
            .set(PC_IMAGE_ID, imageId)
            .set(PC_META_TITLE, metaTitle)
            .set(PC_META_DESCRIPTION, metaDescription)
            .set(PC_SORT_ORDER, sortOrder)
            .returning(PC_ID)
            .fetchOne()
            .get(PC_ID);
    }

    public void update(UUID id, String name, String slug, String description, UUID imageId,
                       String metaTitle, String metaDescription) {
        dsl.update(PC)
            .set(PC_NAME, name)
            .set(PC_SLUG, slug)
            .set(PC_DESCRIPTION, description)
            .set(PC_IMAGE_ID, imageId)
            .set(PC_META_TITLE, metaTitle)
            .set(PC_META_DESCRIPTION, metaDescription)
            .set(PC_UPDATED_AT, OffsetDateTime.now())
            .where(PC_ID.eq(id))
            .execute();
    }

    public void delete(UUID id) {
        dsl.deleteFrom(PC)
            .where(PC_ID.eq(id))
            .execute();
    }

    public boolean existsById(UUID id) {
        return dsl.fetchExists(
            dsl.select(PC_ID).from(PC).where(PC_ID.eq(id))
        );
    }

    public boolean existsBySlug(String slug) {
        return dsl.fetchExists(
            dsl.select(PC_ID).from(PC).where(PC_SLUG.eq(slug))
        );
    }

    public void updateSortOrders(List<UUID> orderedIds) {
        for (int i = 0; i < orderedIds.size(); i++) {
            dsl.update(PC)
                .set(PC_SORT_ORDER, i)
                .where(PC_ID.eq(orderedIds.get(i)))
                .execute();
        }
    }

    public int findNextSortOrder() {
        var max = dsl.select(DSL.max(PC_SORT_ORDER))
            .from(PC)
            .fetchOne(0, Integer.class);
        return (max != null ? max : -1) + 1;
    }
}
