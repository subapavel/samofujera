-- ============================================================
-- V18: Media library tables + category image FK migration
-- ============================================================

-- 1. Media folders (logical folder hierarchy)
CREATE TABLE media_folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    parent_folder_id UUID REFERENCES media_folders(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(parent_folder_id, slug)
);

-- 2. Media items (files stored in R2)
CREATE TABLE media_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    folder_id UUID REFERENCES media_folders(id) ON DELETE SET NULL,
    original_filename VARCHAR(500) NOT NULL,
    storage_key VARCHAR(500) NOT NULL UNIQUE,
    mime_type VARCHAR(100) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    width INT,
    height INT,
    alt_text VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_media_items_folder ON media_items(folder_id);
CREATE INDEX idx_media_items_mime ON media_items(mime_type);

-- 3. Add image_media_id FK to product_categories
ALTER TABLE product_categories ADD COLUMN image_media_id UUID REFERENCES media_items(id) ON DELETE SET NULL;

-- 4. Drop old image_url column (no data to migrate — categories have no images yet)
ALTER TABLE product_categories DROP COLUMN image_url;
