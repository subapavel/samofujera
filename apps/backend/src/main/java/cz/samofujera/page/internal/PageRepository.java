package cz.samofujera.page.internal;

import org.jooq.Condition;
import org.jooq.DSLContext;
import org.jooq.JSONB;
import org.jooq.impl.DSL;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static cz.samofujera.generated.jooq.Tables.PAGES;

@Repository
public class PageRepository {

    private final DSLContext dsl;

    PageRepository(DSLContext dsl) {
        this.dsl = dsl;
    }

    public record PageRow(
        UUID id, String slug, String title, String status, String pageType,
        JSONB content, String metaTitle, String metaDescription,
        UUID ogImageId, int sortOrder, boolean showInNav,
        OffsetDateTime createdAt, OffsetDateTime updatedAt,
        OffsetDateTime publishedAt, UUID createdBy
    ) {}

    public record PageListRow(
        UUID id, String slug, String title, String status, String pageType,
        int sortOrder, boolean showInNav,
        OffsetDateTime createdAt, OffsetDateTime updatedAt, OffsetDateTime publishedAt
    ) {}

    public Optional<PageRow> findById(UUID id) {
        return dsl.select(
                PAGES.ID, PAGES.SLUG, PAGES.TITLE, PAGES.STATUS, PAGES.PAGE_TYPE,
                PAGES.CONTENT, PAGES.META_TITLE, PAGES.META_DESCRIPTION,
                PAGES.OG_IMAGE_ID, PAGES.SORT_ORDER, PAGES.SHOW_IN_NAV,
                PAGES.CREATED_AT, PAGES.UPDATED_AT, PAGES.PUBLISHED_AT, PAGES.CREATED_BY)
            .from(PAGES)
            .where(PAGES.ID.eq(id))
            .fetchOptional(r -> new PageRow(
                r.get(PAGES.ID), r.get(PAGES.SLUG), r.get(PAGES.TITLE),
                r.get(PAGES.STATUS), r.get(PAGES.PAGE_TYPE),
                r.get(PAGES.CONTENT), r.get(PAGES.META_TITLE), r.get(PAGES.META_DESCRIPTION),
                r.get(PAGES.OG_IMAGE_ID), r.get(PAGES.SORT_ORDER), r.get(PAGES.SHOW_IN_NAV),
                r.get(PAGES.CREATED_AT), r.get(PAGES.UPDATED_AT),
                r.get(PAGES.PUBLISHED_AT), r.get(PAGES.CREATED_BY)
            ));
    }

    public Optional<PageRow> findBySlug(String slug) {
        return dsl.select(
                PAGES.ID, PAGES.SLUG, PAGES.TITLE, PAGES.STATUS, PAGES.PAGE_TYPE,
                PAGES.CONTENT, PAGES.META_TITLE, PAGES.META_DESCRIPTION,
                PAGES.OG_IMAGE_ID, PAGES.SORT_ORDER, PAGES.SHOW_IN_NAV,
                PAGES.CREATED_AT, PAGES.UPDATED_AT, PAGES.PUBLISHED_AT, PAGES.CREATED_BY)
            .from(PAGES)
            .where(PAGES.SLUG.eq(slug))
            .fetchOptional(r -> new PageRow(
                r.get(PAGES.ID), r.get(PAGES.SLUG), r.get(PAGES.TITLE),
                r.get(PAGES.STATUS), r.get(PAGES.PAGE_TYPE),
                r.get(PAGES.CONTENT), r.get(PAGES.META_TITLE), r.get(PAGES.META_DESCRIPTION),
                r.get(PAGES.OG_IMAGE_ID), r.get(PAGES.SORT_ORDER), r.get(PAGES.SHOW_IN_NAV),
                r.get(PAGES.CREATED_AT), r.get(PAGES.UPDATED_AT),
                r.get(PAGES.PUBLISHED_AT), r.get(PAGES.CREATED_BY)
            ));
    }

    public List<PageListRow> findAll(String status, String type, String search, int page, int limit) {
        var condition = buildCondition(status, type, search);
        return dsl.select(
                PAGES.ID, PAGES.SLUG, PAGES.TITLE, PAGES.STATUS, PAGES.PAGE_TYPE,
                PAGES.SORT_ORDER, PAGES.SHOW_IN_NAV,
                PAGES.CREATED_AT, PAGES.UPDATED_AT, PAGES.PUBLISHED_AT)
            .from(PAGES)
            .where(condition)
            .orderBy(PAGES.UPDATED_AT.desc())
            .limit(limit)
            .offset((page - 1) * limit)
            .fetch(r -> new PageListRow(
                r.get(PAGES.ID), r.get(PAGES.SLUG), r.get(PAGES.TITLE),
                r.get(PAGES.STATUS), r.get(PAGES.PAGE_TYPE),
                r.get(PAGES.SORT_ORDER), r.get(PAGES.SHOW_IN_NAV),
                r.get(PAGES.CREATED_AT), r.get(PAGES.UPDATED_AT), r.get(PAGES.PUBLISHED_AT)
            ));
    }

    public int count(String status, String type, String search) {
        var condition = buildCondition(status, type, search);
        return dsl.selectCount().from(PAGES).where(condition).fetchOne(0, int.class);
    }

    public UUID create(String slug, String title, String pageType, JSONB content,
                       String metaTitle, String metaDescription, UUID ogImageId, UUID createdBy) {
        return dsl.insertInto(PAGES)
            .set(PAGES.SLUG, slug)
            .set(PAGES.TITLE, title)
            .set(PAGES.PAGE_TYPE, pageType)
            .set(PAGES.CONTENT, content)
            .set(PAGES.META_TITLE, metaTitle)
            .set(PAGES.META_DESCRIPTION, metaDescription)
            .set(PAGES.OG_IMAGE_ID, ogImageId)
            .set(PAGES.CREATED_BY, createdBy)
            .returning(PAGES.ID)
            .fetchOne()
            .getId();
    }

    public void update(UUID id, String slug, String title, JSONB content,
                       String metaTitle, String metaDescription, UUID ogImageId) {
        dsl.update(PAGES)
            .set(PAGES.SLUG, slug)
            .set(PAGES.TITLE, title)
            .set(PAGES.CONTENT, content)
            .set(PAGES.META_TITLE, metaTitle)
            .set(PAGES.META_DESCRIPTION, metaDescription)
            .set(PAGES.OG_IMAGE_ID, ogImageId)
            .set(PAGES.UPDATED_AT, OffsetDateTime.now())
            .where(PAGES.ID.eq(id))
            .execute();
    }

    public void updateStatus(UUID id, String status) {
        var update = dsl.update(PAGES)
            .set(PAGES.STATUS, status)
            .set(PAGES.UPDATED_AT, OffsetDateTime.now());
        if ("PUBLISHED".equals(status)) {
            update = update.set(PAGES.PUBLISHED_AT, OffsetDateTime.now());
        }
        update.where(PAGES.ID.eq(id)).execute();
    }

    public void delete(UUID id) {
        dsl.deleteFrom(PAGES).where(PAGES.ID.eq(id)).execute();
    }

    private Condition buildCondition(String status, String type, String search) {
        Condition condition = DSL.trueCondition();
        if (status != null && !status.isBlank()) {
            condition = condition.and(PAGES.STATUS.eq(status));
        }
        if (type != null && !type.isBlank()) {
            condition = condition.and(PAGES.PAGE_TYPE.eq(type));
        }
        if (search != null && !search.isBlank()) {
            condition = condition.and(
                PAGES.TITLE.containsIgnoreCase(search)
                    .or(PAGES.SLUG.containsIgnoreCase(search))
            );
        }
        return condition;
    }
}
