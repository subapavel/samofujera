package cz.samofujera.page.internal;

import org.jooq.DSLContext;
import org.jooq.JSONB;
import org.jooq.impl.DSL;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static cz.samofujera.generated.jooq.Tables.PAGE_REVISIONS;

@Repository
public class PageRevisionRepository {

    private final DSLContext dsl;

    PageRevisionRepository(DSLContext dsl) {
        this.dsl = dsl;
    }

    public record RevisionRow(
        UUID id, UUID pageId, int version, JSONB content,
        String title, String slug,
        String metaTitle, String metaDescription, String metaKeywords,
        String ogTitle, String ogDescription, UUID ogImageId,
        boolean noindex, boolean nofollow,
        UUID createdBy, OffsetDateTime createdAt
    ) {}

    public UUID create(UUID pageId, JSONB content, String title, String slug,
                       String metaTitle, String metaDescription, String metaKeywords,
                       String ogTitle, String ogDescription, UUID ogImageId,
                       boolean noindex, boolean nofollow, UUID createdBy) {
        int nextVersion = dsl.select(DSL.coalesce(DSL.max(PAGE_REVISIONS.VERSION), 0))
            .from(PAGE_REVISIONS)
            .where(PAGE_REVISIONS.PAGE_ID.eq(pageId))
            .fetchOne(0, int.class) + 1;

        return dsl.insertInto(PAGE_REVISIONS)
            .set(PAGE_REVISIONS.PAGE_ID, pageId)
            .set(PAGE_REVISIONS.VERSION, nextVersion)
            .set(PAGE_REVISIONS.CONTENT, content)
            .set(PAGE_REVISIONS.TITLE, title)
            .set(PAGE_REVISIONS.SLUG, slug)
            .set(PAGE_REVISIONS.META_TITLE, metaTitle)
            .set(PAGE_REVISIONS.META_DESCRIPTION, metaDescription)
            .set(PAGE_REVISIONS.META_KEYWORDS, metaKeywords)
            .set(PAGE_REVISIONS.OG_TITLE, ogTitle)
            .set(PAGE_REVISIONS.OG_DESCRIPTION, ogDescription)
            .set(PAGE_REVISIONS.OG_IMAGE_ID, ogImageId)
            .set(PAGE_REVISIONS.NOINDEX, noindex)
            .set(PAGE_REVISIONS.NOFOLLOW, nofollow)
            .set(PAGE_REVISIONS.CREATED_BY, createdBy)
            .returning(PAGE_REVISIONS.ID)
            .fetchOne()
            .getId();
    }

    public List<RevisionRow> findByPageId(UUID pageId) {
        return dsl.select(
                PAGE_REVISIONS.ID, PAGE_REVISIONS.PAGE_ID, PAGE_REVISIONS.VERSION,
                PAGE_REVISIONS.CONTENT, PAGE_REVISIONS.TITLE, PAGE_REVISIONS.SLUG,
                PAGE_REVISIONS.META_TITLE, PAGE_REVISIONS.META_DESCRIPTION, PAGE_REVISIONS.META_KEYWORDS,
                PAGE_REVISIONS.OG_TITLE, PAGE_REVISIONS.OG_DESCRIPTION, PAGE_REVISIONS.OG_IMAGE_ID,
                PAGE_REVISIONS.NOINDEX, PAGE_REVISIONS.NOFOLLOW,
                PAGE_REVISIONS.CREATED_BY, PAGE_REVISIONS.CREATED_AT)
            .from(PAGE_REVISIONS)
            .where(PAGE_REVISIONS.PAGE_ID.eq(pageId))
            .orderBy(PAGE_REVISIONS.VERSION.desc())
            .fetch(r -> new RevisionRow(
                r.get(PAGE_REVISIONS.ID), r.get(PAGE_REVISIONS.PAGE_ID), r.get(PAGE_REVISIONS.VERSION),
                r.get(PAGE_REVISIONS.CONTENT), r.get(PAGE_REVISIONS.TITLE), r.get(PAGE_REVISIONS.SLUG),
                r.get(PAGE_REVISIONS.META_TITLE), r.get(PAGE_REVISIONS.META_DESCRIPTION),
                r.get(PAGE_REVISIONS.META_KEYWORDS),
                r.get(PAGE_REVISIONS.OG_TITLE), r.get(PAGE_REVISIONS.OG_DESCRIPTION),
                r.get(PAGE_REVISIONS.OG_IMAGE_ID),
                r.get(PAGE_REVISIONS.NOINDEX), r.get(PAGE_REVISIONS.NOFOLLOW),
                r.get(PAGE_REVISIONS.CREATED_BY), r.get(PAGE_REVISIONS.CREATED_AT)
            ));
    }

    public Optional<RevisionRow> findById(UUID id) {
        return dsl.select(
                PAGE_REVISIONS.ID, PAGE_REVISIONS.PAGE_ID, PAGE_REVISIONS.VERSION,
                PAGE_REVISIONS.CONTENT, PAGE_REVISIONS.TITLE, PAGE_REVISIONS.SLUG,
                PAGE_REVISIONS.META_TITLE, PAGE_REVISIONS.META_DESCRIPTION, PAGE_REVISIONS.META_KEYWORDS,
                PAGE_REVISIONS.OG_TITLE, PAGE_REVISIONS.OG_DESCRIPTION, PAGE_REVISIONS.OG_IMAGE_ID,
                PAGE_REVISIONS.NOINDEX, PAGE_REVISIONS.NOFOLLOW,
                PAGE_REVISIONS.CREATED_BY, PAGE_REVISIONS.CREATED_AT)
            .from(PAGE_REVISIONS)
            .where(PAGE_REVISIONS.ID.eq(id))
            .fetchOptional(r -> new RevisionRow(
                r.get(PAGE_REVISIONS.ID), r.get(PAGE_REVISIONS.PAGE_ID), r.get(PAGE_REVISIONS.VERSION),
                r.get(PAGE_REVISIONS.CONTENT), r.get(PAGE_REVISIONS.TITLE), r.get(PAGE_REVISIONS.SLUG),
                r.get(PAGE_REVISIONS.META_TITLE), r.get(PAGE_REVISIONS.META_DESCRIPTION),
                r.get(PAGE_REVISIONS.META_KEYWORDS),
                r.get(PAGE_REVISIONS.OG_TITLE), r.get(PAGE_REVISIONS.OG_DESCRIPTION),
                r.get(PAGE_REVISIONS.OG_IMAGE_ID),
                r.get(PAGE_REVISIONS.NOINDEX), r.get(PAGE_REVISIONS.NOFOLLOW),
                r.get(PAGE_REVISIONS.CREATED_BY), r.get(PAGE_REVISIONS.CREATED_AT)
            ));
    }
}
