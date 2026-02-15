package cz.samofujera.catalog.internal;

import org.jooq.DSLContext;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import static cz.samofujera.generated.jooq.Tables.PRODUCT_CATEGORIES;
import static cz.samofujera.generated.jooq.Tables.PRODUCT_CATEGORY_ASSIGNMENTS;

@Repository
public class ProductCategoryAssignmentRepository {

    private final DSLContext dsl;

    ProductCategoryAssignmentRepository(DSLContext dsl) {
        this.dsl = dsl;
    }

    public record CategorySummaryRow(UUID id, String name, String slug) {}

    public List<CategorySummaryRow> findCategoriesForProduct(UUID productId) {
        return dsl.select(PRODUCT_CATEGORIES.ID, PRODUCT_CATEGORIES.NAME, PRODUCT_CATEGORIES.SLUG)
            .from(PRODUCT_CATEGORY_ASSIGNMENTS)
            .join(PRODUCT_CATEGORIES).on(PRODUCT_CATEGORY_ASSIGNMENTS.CATEGORY_ID.eq(PRODUCT_CATEGORIES.ID))
            .where(PRODUCT_CATEGORY_ASSIGNMENTS.PRODUCT_ID.eq(productId))
            .orderBy(PRODUCT_CATEGORIES.SORT_ORDER.asc(), PRODUCT_CATEGORIES.NAME.asc())
            .fetch(r -> new CategorySummaryRow(
                r.get(PRODUCT_CATEGORIES.ID),
                r.get(PRODUCT_CATEGORIES.NAME),
                r.get(PRODUCT_CATEGORIES.SLUG)
            ));
    }

    public Map<UUID, List<CategorySummaryRow>> findCategoriesForProducts(List<UUID> productIds) {
        if (productIds.isEmpty()) {
            return Map.of();
        }

        record Row(UUID productId, UUID categoryId, String name, String slug) {}

        var rows = dsl.select(
                PRODUCT_CATEGORY_ASSIGNMENTS.PRODUCT_ID,
                PRODUCT_CATEGORIES.ID, PRODUCT_CATEGORIES.NAME, PRODUCT_CATEGORIES.SLUG)
            .from(PRODUCT_CATEGORY_ASSIGNMENTS)
            .join(PRODUCT_CATEGORIES).on(PRODUCT_CATEGORY_ASSIGNMENTS.CATEGORY_ID.eq(PRODUCT_CATEGORIES.ID))
            .where(PRODUCT_CATEGORY_ASSIGNMENTS.PRODUCT_ID.in(productIds))
            .orderBy(PRODUCT_CATEGORIES.SORT_ORDER.asc(), PRODUCT_CATEGORIES.NAME.asc())
            .fetch(r -> new Row(
                r.get(PRODUCT_CATEGORY_ASSIGNMENTS.PRODUCT_ID),
                r.get(PRODUCT_CATEGORIES.ID),
                r.get(PRODUCT_CATEGORIES.NAME),
                r.get(PRODUCT_CATEGORIES.SLUG)
            ));

        return rows.stream().collect(Collectors.groupingBy(
            Row::productId,
            Collectors.mapping(
                r -> new CategorySummaryRow(r.categoryId(), r.name(), r.slug()),
                Collectors.toList()
            )
        ));
    }

    public List<UUID> findProductIdsByCategorySlug(String slug) {
        return dsl.select(PRODUCT_CATEGORY_ASSIGNMENTS.PRODUCT_ID)
            .from(PRODUCT_CATEGORY_ASSIGNMENTS)
            .join(PRODUCT_CATEGORIES).on(PRODUCT_CATEGORY_ASSIGNMENTS.CATEGORY_ID.eq(PRODUCT_CATEGORIES.ID))
            .where(PRODUCT_CATEGORIES.SLUG.eq(slug))
            .fetch(PRODUCT_CATEGORY_ASSIGNMENTS.PRODUCT_ID);
    }

    public void assignCategories(UUID productId, List<UUID> categoryIds) {
        dsl.deleteFrom(PRODUCT_CATEGORY_ASSIGNMENTS)
            .where(PRODUCT_CATEGORY_ASSIGNMENTS.PRODUCT_ID.eq(productId))
            .execute();

        if (categoryIds != null && !categoryIds.isEmpty()) {
            var insert = dsl.insertInto(PRODUCT_CATEGORY_ASSIGNMENTS,
                PRODUCT_CATEGORY_ASSIGNMENTS.PRODUCT_ID,
                PRODUCT_CATEGORY_ASSIGNMENTS.CATEGORY_ID);
            for (var categoryId : categoryIds) {
                insert = insert.values(productId, categoryId);
            }
            insert.execute();
        }
    }

    public void removeAllForProduct(UUID productId) {
        dsl.deleteFrom(PRODUCT_CATEGORY_ASSIGNMENTS)
            .where(PRODUCT_CATEGORY_ASSIGNMENTS.PRODUCT_ID.eq(productId))
            .execute();
    }
}
