package cz.samofujera.catalog.internal;

import org.jooq.DSLContext;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static cz.samofujera.generated.jooq.Tables.CATEGORIES;

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
        UUID parentId,
        int sortOrder,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
    ) {}

    public List<CategoryRow> findAll() {
        return dsl.selectFrom(CATEGORIES)
            .orderBy(CATEGORIES.SORT_ORDER.asc(), CATEGORIES.NAME.asc())
            .fetch(r -> new CategoryRow(
                r.getId(),
                r.getName(),
                r.getSlug(),
                r.getParentId(),
                r.getSortOrder(),
                r.getCreatedAt(),
                r.getUpdatedAt()
            ));
    }

    public Optional<CategoryRow> findById(UUID id) {
        return dsl.selectFrom(CATEGORIES)
            .where(CATEGORIES.ID.eq(id))
            .fetchOptional(r -> new CategoryRow(
                r.getId(),
                r.getName(),
                r.getSlug(),
                r.getParentId(),
                r.getSortOrder(),
                r.getCreatedAt(),
                r.getUpdatedAt()
            ));
    }

    public UUID create(String name, String slug, UUID parentId, int sortOrder) {
        return dsl.insertInto(CATEGORIES)
            .set(CATEGORIES.NAME, name)
            .set(CATEGORIES.SLUG, slug)
            .set(CATEGORIES.PARENT_ID, parentId)
            .set(CATEGORIES.SORT_ORDER, sortOrder)
            .returning(CATEGORIES.ID)
            .fetchOne()
            .getId();
    }

    public void update(UUID id, String name, String slug, UUID parentId, int sortOrder) {
        dsl.update(CATEGORIES)
            .set(CATEGORIES.NAME, name)
            .set(CATEGORIES.SLUG, slug)
            .set(CATEGORIES.PARENT_ID, parentId)
            .set(CATEGORIES.SORT_ORDER, sortOrder)
            .set(CATEGORIES.UPDATED_AT, OffsetDateTime.now())
            .where(CATEGORIES.ID.eq(id))
            .execute();
    }

    public void delete(UUID id) {
        dsl.deleteFrom(CATEGORIES)
            .where(CATEGORIES.ID.eq(id))
            .execute();
    }

    public boolean existsBySlug(String slug) {
        return dsl.fetchExists(
            dsl.selectFrom(CATEGORIES)
               .where(CATEGORIES.SLUG.eq(slug))
        );
    }
}
