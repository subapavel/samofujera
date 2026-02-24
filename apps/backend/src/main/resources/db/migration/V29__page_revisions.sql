-- Page revisions (snapshots on publish)
CREATE TABLE page_revisions (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id          UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    version          INT NOT NULL,
    content          JSONB NOT NULL,
    title            VARCHAR(500) NOT NULL,
    slug             VARCHAR(255) NOT NULL,
    meta_title       VARCHAR(200),
    meta_description VARCHAR(500),
    meta_keywords    VARCHAR(300),
    og_title         VARCHAR(200),
    og_description   VARCHAR(500),
    og_image_id      UUID REFERENCES images(id),
    noindex          BOOLEAN NOT NULL DEFAULT false,
    nofollow         BOOLEAN NOT NULL DEFAULT false,
    created_by       UUID REFERENCES users(id),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(page_id, version)
);

CREATE INDEX idx_page_revisions_page_id ON page_revisions(page_id);

-- Add published revision pointer to pages
ALTER TABLE pages ADD COLUMN published_revision_id UUID REFERENCES page_revisions(id);

-- Backfill: create revision 1 for already-published pages
INSERT INTO page_revisions (page_id, version, content, title, slug,
    meta_title, meta_description, meta_keywords, og_title, og_description,
    og_image_id, noindex, nofollow, created_by, created_at)
SELECT id, 1, content, title, slug,
    meta_title, meta_description, meta_keywords, og_title, og_description,
    og_image_id, noindex, nofollow, created_by, COALESCE(published_at, now())
FROM pages
WHERE status = 'PUBLISHED';

-- Point published pages to their revision
UPDATE pages p
SET published_revision_id = pr.id
FROM page_revisions pr
WHERE pr.page_id = p.id AND pr.version = 1 AND p.status = 'PUBLISHED';

-- Page reviews (foundation for review workflow)
CREATE TABLE page_reviews (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id     UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES users(id),
    status      VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    comment     TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_page_reviews_page_id ON page_reviews(page_id);
