CREATE TABLE pages (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug             VARCHAR(255) NOT NULL UNIQUE,
    title            VARCHAR(500) NOT NULL,
    status           VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    page_type        VARCHAR(20) NOT NULL DEFAULT 'CUSTOM',
    content          JSONB NOT NULL DEFAULT '{}',
    meta_title       VARCHAR(200),
    meta_description VARCHAR(500),
    og_image_id      UUID REFERENCES media_items(id) ON DELETE SET NULL,
    sort_order       INT NOT NULL DEFAULT 0,
    show_in_nav      BOOLEAN NOT NULL DEFAULT false,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    published_at     TIMESTAMPTZ,
    created_by       UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_pages_slug ON pages(slug);
CREATE INDEX idx_pages_status ON pages(status);
CREATE INDEX idx_pages_page_type ON pages(page_type);
