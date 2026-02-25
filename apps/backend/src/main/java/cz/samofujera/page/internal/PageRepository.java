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
import static cz.samofujera.generated.jooq.Tables.PRODUCTS;

@Repository
public class PageRepository {

    private final DSLContext dsl;

    PageRepository(DSLContext dsl) {
        this.dsl = dsl;
    }

    public record PageRow(
        UUID id, String slug, String title, String status, String pageType,
        JSONB content, String metaTitle, String metaDescription,
        UUID ogImageId, String metaKeywords, String ogTitle, String ogDescription,
        boolean noindex, boolean nofollow,
        int sortOrder, boolean showInNav,
        OffsetDateTime createdAt, OffsetDateTime updatedAt,
        OffsetDateTime publishedAt, UUID createdBy,
        OffsetDateTime scheduledPublishAt, UUID publishedRevisionId,
        UUID productId
    ) {}

    public record PageListRow(
        UUID id, String slug, String title, String status, String pageType,
        int sortOrder, boolean showInNav,
        OffsetDateTime createdAt, OffsetDateTime updatedAt, OffsetDateTime publishedAt,
        OffsetDateTime scheduledPublishAt
    ) {}

    public Optional<PageRow> findById(UUID id) {
        return dsl.select(
                PAGES.ID, PAGES.SLUG, PAGES.TITLE, PAGES.STATUS, PAGES.PAGE_TYPE,
                PAGES.CONTENT, PAGES.META_TITLE, PAGES.META_DESCRIPTION,
                PAGES.OG_IMAGE_ID, PAGES.META_KEYWORDS, PAGES.OG_TITLE, PAGES.OG_DESCRIPTION,
                PAGES.NOINDEX, PAGES.NOFOLLOW,
                PAGES.SORT_ORDER, PAGES.SHOW_IN_NAV,
                PAGES.CREATED_AT, PAGES.UPDATED_AT, PAGES.PUBLISHED_AT, PAGES.CREATED_BY,
                PAGES.SCHEDULED_PUBLISH_AT, PAGES.PUBLISHED_REVISION_ID, PAGES.PRODUCT_ID)
            .from(PAGES)
            .where(PAGES.ID.eq(id))
            .fetchOptional(this::toPageRow);
    }

    public Optional<PageRow> findBySlug(String slug) {
        return dsl.select(
                PAGES.ID, PAGES.SLUG, PAGES.TITLE, PAGES.STATUS, PAGES.PAGE_TYPE,
                PAGES.CONTENT, PAGES.META_TITLE, PAGES.META_DESCRIPTION,
                PAGES.OG_IMAGE_ID, PAGES.META_KEYWORDS, PAGES.OG_TITLE, PAGES.OG_DESCRIPTION,
                PAGES.NOINDEX, PAGES.NOFOLLOW,
                PAGES.SORT_ORDER, PAGES.SHOW_IN_NAV,
                PAGES.CREATED_AT, PAGES.UPDATED_AT, PAGES.PUBLISHED_AT, PAGES.CREATED_BY,
                PAGES.SCHEDULED_PUBLISH_AT, PAGES.PUBLISHED_REVISION_ID, PAGES.PRODUCT_ID)
            .from(PAGES)
            .where(PAGES.SLUG.eq(slug))
            .fetchOptional(this::toPageRow);
    }

    public List<PageListRow> findAll(String status, String type, String search, int page, int limit) {
        var condition = buildCondition(status, type, search);
        return dsl.select(
                PAGES.ID, PAGES.SLUG, PAGES.TITLE, PAGES.STATUS, PAGES.PAGE_TYPE,
                PAGES.SORT_ORDER, PAGES.SHOW_IN_NAV,
                PAGES.CREATED_AT, PAGES.UPDATED_AT, PAGES.PUBLISHED_AT,
                PAGES.SCHEDULED_PUBLISH_AT)
            .from(PAGES)
            .where(condition)
            .orderBy(PAGES.UPDATED_AT.desc())
            .limit(limit)
            .offset((page - 1) * limit)
            .fetch(r -> new PageListRow(
                r.get(PAGES.ID), r.get(PAGES.SLUG), r.get(PAGES.TITLE),
                r.get(PAGES.STATUS), r.get(PAGES.PAGE_TYPE),
                r.get(PAGES.SORT_ORDER), r.get(PAGES.SHOW_IN_NAV),
                r.get(PAGES.CREATED_AT), r.get(PAGES.UPDATED_AT), r.get(PAGES.PUBLISHED_AT),
                r.get(PAGES.SCHEDULED_PUBLISH_AT)
            ));
    }

    public int count(String status, String type, String search) {
        var condition = buildCondition(status, type, search);
        return dsl.selectCount().from(PAGES).where(condition).fetchOne(0, int.class);
    }

    public UUID create(String slug, String title, String pageType, JSONB content,
                       String metaTitle, String metaDescription, UUID ogImageId, UUID createdBy,
                       UUID productId) {
        var insert = dsl.insertInto(PAGES)
            .set(PAGES.SLUG, slug)
            .set(PAGES.TITLE, title)
            .set(PAGES.PAGE_TYPE, pageType)
            .set(PAGES.CONTENT, content)
            .set(PAGES.META_TITLE, metaTitle)
            .set(PAGES.META_DESCRIPTION, metaDescription)
            .set(PAGES.OG_IMAGE_ID, ogImageId)
            .set(PAGES.CREATED_BY, createdBy);
        if (productId != null) {
            insert = insert.set(PAGES.PRODUCT_ID, productId);
        }
        return insert.returning(PAGES.ID)
            .fetchOne()
            .getId();
    }

    public void update(UUID id, String slug, String title, JSONB content,
                       String metaTitle, String metaDescription, UUID ogImageId,
                       boolean showInNav, String metaKeywords, String ogTitle,
                       String ogDescription, boolean noindex, boolean nofollow) {
        dsl.update(PAGES)
            .set(PAGES.SLUG, slug)
            .set(PAGES.TITLE, title)
            .set(PAGES.CONTENT, content)
            .set(PAGES.META_TITLE, metaTitle)
            .set(PAGES.META_DESCRIPTION, metaDescription)
            .set(PAGES.OG_IMAGE_ID, ogImageId)
            .set(PAGES.SHOW_IN_NAV, showInNav)
            .set(PAGES.META_KEYWORDS, metaKeywords)
            .set(PAGES.OG_TITLE, ogTitle)
            .set(PAGES.OG_DESCRIPTION, ogDescription)
            .set(PAGES.NOINDEX, noindex)
            .set(PAGES.NOFOLLOW, nofollow)
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

    public void updateScheduledPublishAt(UUID id, OffsetDateTime scheduledAt) {
        dsl.update(PAGES)
            .set(PAGES.SCHEDULED_PUBLISH_AT, scheduledAt)
            .set(PAGES.UPDATED_AT, OffsetDateTime.now())
            .where(PAGES.ID.eq(id))
            .execute();
    }

    public void clearScheduledPublishAt(UUID id) {
        dsl.update(PAGES)
            .setNull(PAGES.SCHEDULED_PUBLISH_AT)
            .set(PAGES.UPDATED_AT, OffsetDateTime.now())
            .where(PAGES.ID.eq(id))
            .execute();
    }

    public Optional<PageRow> findByProductSlug(String productSlug) {
        return dsl.select(
                PAGES.ID, PAGES.SLUG, PAGES.TITLE, PAGES.STATUS, PAGES.PAGE_TYPE,
                PAGES.CONTENT, PAGES.META_TITLE, PAGES.META_DESCRIPTION,
                PAGES.OG_IMAGE_ID, PAGES.META_KEYWORDS, PAGES.OG_TITLE, PAGES.OG_DESCRIPTION,
                PAGES.NOINDEX, PAGES.NOFOLLOW,
                PAGES.SORT_ORDER, PAGES.SHOW_IN_NAV,
                PAGES.CREATED_AT, PAGES.UPDATED_AT, PAGES.PUBLISHED_AT, PAGES.CREATED_BY,
                PAGES.SCHEDULED_PUBLISH_AT, PAGES.PUBLISHED_REVISION_ID, PAGES.PRODUCT_ID)
            .from(PAGES)
            .join(PRODUCTS).on(PAGES.PRODUCT_ID.eq(PRODUCTS.ID))
            .where(PRODUCTS.SLUG.eq(productSlug))
            .fetchOptional(this::toPageRow);
    }

    public Optional<PageRow> findByProductId(UUID productId) {
        return dsl.select(
                PAGES.ID, PAGES.SLUG, PAGES.TITLE, PAGES.STATUS, PAGES.PAGE_TYPE,
                PAGES.CONTENT, PAGES.META_TITLE, PAGES.META_DESCRIPTION,
                PAGES.OG_IMAGE_ID, PAGES.META_KEYWORDS, PAGES.OG_TITLE, PAGES.OG_DESCRIPTION,
                PAGES.NOINDEX, PAGES.NOFOLLOW,
                PAGES.SORT_ORDER, PAGES.SHOW_IN_NAV,
                PAGES.CREATED_AT, PAGES.UPDATED_AT, PAGES.PUBLISHED_AT, PAGES.CREATED_BY,
                PAGES.SCHEDULED_PUBLISH_AT, PAGES.PUBLISHED_REVISION_ID, PAGES.PRODUCT_ID)
            .from(PAGES)
            .where(PAGES.PRODUCT_ID.eq(productId))
            .fetchOptional(this::toPageRow);
    }

    public List<PageRow> findDueForPublish(OffsetDateTime now) {
        return dsl.select(
                PAGES.ID, PAGES.SLUG, PAGES.TITLE, PAGES.STATUS, PAGES.PAGE_TYPE,
                PAGES.CONTENT, PAGES.META_TITLE, PAGES.META_DESCRIPTION,
                PAGES.OG_IMAGE_ID, PAGES.META_KEYWORDS, PAGES.OG_TITLE, PAGES.OG_DESCRIPTION,
                PAGES.NOINDEX, PAGES.NOFOLLOW,
                PAGES.SORT_ORDER, PAGES.SHOW_IN_NAV,
                PAGES.CREATED_AT, PAGES.UPDATED_AT, PAGES.PUBLISHED_AT, PAGES.CREATED_BY,
                PAGES.SCHEDULED_PUBLISH_AT, PAGES.PUBLISHED_REVISION_ID, PAGES.PRODUCT_ID)
            .from(PAGES)
            .where(PAGES.SCHEDULED_PUBLISH_AT.le(now))
            .and(PAGES.STATUS.eq("DRAFT"))
            .fetch(this::toPageRow);
    }

    public void setPublishedRevisionId(UUID id, UUID revisionId) {
        dsl.update(PAGES)
            .set(PAGES.PUBLISHED_REVISION_ID, revisionId)
            .set(PAGES.UPDATED_AT, OffsetDateTime.now())
            .where(PAGES.ID.eq(id))
            .execute();
    }

    public void delete(UUID id) {
        dsl.deleteFrom(PAGES).where(PAGES.ID.eq(id)).execute();
    }

    private Condition buildCondition(String status, String type, String search) {
        // Exclude PRODUCT pages from the admin pages list by default
        Condition condition = PAGES.PAGE_TYPE.ne("PRODUCT");
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

    private PageRow toPageRow(org.jooq.Record r) {
        return new PageRow(
            r.get(PAGES.ID), r.get(PAGES.SLUG), r.get(PAGES.TITLE),
            r.get(PAGES.STATUS), r.get(PAGES.PAGE_TYPE),
            r.get(PAGES.CONTENT), r.get(PAGES.META_TITLE), r.get(PAGES.META_DESCRIPTION),
            r.get(PAGES.OG_IMAGE_ID), r.get(PAGES.META_KEYWORDS),
            r.get(PAGES.OG_TITLE), r.get(PAGES.OG_DESCRIPTION),
            r.get(PAGES.NOINDEX), r.get(PAGES.NOFOLLOW),
            r.get(PAGES.SORT_ORDER), r.get(PAGES.SHOW_IN_NAV),
            r.get(PAGES.CREATED_AT), r.get(PAGES.UPDATED_AT),
            r.get(PAGES.PUBLISHED_AT), r.get(PAGES.CREATED_BY),
            r.get(PAGES.SCHEDULED_PUBLISH_AT), r.get(PAGES.PUBLISHED_REVISION_ID),
            r.get(PAGES.PRODUCT_ID)
        );
    }
}
