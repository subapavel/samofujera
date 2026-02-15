package cz.samofujera.catalog.internal;

import org.jooq.DSLContext;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static cz.samofujera.generated.jooq.Tables.PRODUCT_CATEGORIES;

@Repository
public class CategoryRepository {

    private final DSLContext dsl;

    CategoryRepository(DSLContext dsl) {
        this.dsl = dsl;
    }

    public record CategoryRow(
        UUID id,
        String name,
        String slug,
        String description,
        String imageUrl,
        String metaTitle,
        String metaDescription,
        int sortOrder,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
    ) {}

    public List<CategoryRow> findAll() {
        return dsl.selectFrom(PRODUCT_CATEGORIES)
            .orderBy(PRODUCT_CATEGORIES.SORT_ORDER.asc(), PRODUCT_CATEGORIES.NAME.asc())
            .fetch(r -> new CategoryRow(
                r.getId(),
                r.getName(),
                r.getSlug(),
                r.getDescription(),
                r.getImageUrl(),
                r.getMetaTitle(),
                r.getMetaDescription(),
                r.getSortOrder(),
                r.getCreatedAt(),
                r.getUpdatedAt()
            ));
    }

    public Optional<CategoryRow> findById(UUID id) {
        return dsl.selectFrom(PRODUCT_CATEGORIES)
            .where(PRODUCT_CATEGORIES.ID.eq(id))
            .fetchOptional(r -> new CategoryRow(
                r.getId(),
                r.getName(),
                r.getSlug(),
                r.getDescription(),
                r.getImageUrl(),
                r.getMetaTitle(),
                r.getMetaDescription(),
                r.getSortOrder(),
                r.getCreatedAt(),
                r.getUpdatedAt()
            ));
    }

    public Optional<CategoryRow> findBySlug(String slug) {
        return dsl.selectFrom(PRODUCT_CATEGORIES)
            .where(PRODUCT_CATEGORIES.SLUG.eq(slug))
            .fetchOptional(r -> new CategoryRow(
                r.getId(),
                r.getName(),
                r.getSlug(),
                r.getDescription(),
                r.getImageUrl(),
                r.getMetaTitle(),
                r.getMetaDescription(),
                r.getSortOrder(),
                r.getCreatedAt(),
                r.getUpdatedAt()
            ));
    }

    public UUID create(String name, String slug, String description, String imageUrl,
                       String metaTitle, String metaDescription, int sortOrder) {
        return dsl.insertInto(PRODUCT_CATEGORIES)
            .set(PRODUCT_CATEGORIES.NAME, name)
            .set(PRODUCT_CATEGORIES.SLUG, slug)
            .set(PRODUCT_CATEGORIES.DESCRIPTION, description)
            .set(PRODUCT_CATEGORIES.IMAGE_URL, imageUrl)
            .set(PRODUCT_CATEGORIES.META_TITLE, metaTitle)
            .set(PRODUCT_CATEGORIES.META_DESCRIPTION, metaDescription)
            .set(PRODUCT_CATEGORIES.SORT_ORDER, sortOrder)
            .returning(PRODUCT_CATEGORIES.ID)
            .fetchOne()
            .getId();
    }

    public void update(UUID id, String name, String slug, String description, String imageUrl,
                       String metaTitle, String metaDescription, int sortOrder) {
        dsl.update(PRODUCT_CATEGORIES)
            .set(PRODUCT_CATEGORIES.NAME, name)
            .set(PRODUCT_CATEGORIES.SLUG, slug)
            .set(PRODUCT_CATEGORIES.DESCRIPTION, description)
            .set(PRODUCT_CATEGORIES.IMAGE_URL, imageUrl)
            .set(PRODUCT_CATEGORIES.META_TITLE, metaTitle)
            .set(PRODUCT_CATEGORIES.META_DESCRIPTION, metaDescription)
            .set(PRODUCT_CATEGORIES.SORT_ORDER, sortOrder)
            .set(PRODUCT_CATEGORIES.UPDATED_AT, OffsetDateTime.now())
            .where(PRODUCT_CATEGORIES.ID.eq(id))
            .execute();
    }

    public void delete(UUID id) {
        dsl.deleteFrom(PRODUCT_CATEGORIES)
            .where(PRODUCT_CATEGORIES.ID.eq(id))
            .execute();
    }

    public boolean existsBySlug(String slug) {
        return dsl.fetchExists(
            dsl.selectFrom(PRODUCT_CATEGORIES)
               .where(PRODUCT_CATEGORIES.SLUG.eq(slug))
        );
    }
}
