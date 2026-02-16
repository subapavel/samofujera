-- V19: Unified media system
-- 1. Remove folder system (replaced by virtual filters)
-- 2. Create product_gallery join table (replaces product_images)
-- 3. Migrate existing product_images data into media_items + product_gallery
-- 4. Drop old tables

-- Step 1: Remove folder_id FK from media_items
ALTER TABLE media_items DROP CONSTRAINT IF EXISTS media_items_folder_id_fkey;
ALTER TABLE media_items DROP COLUMN IF EXISTS folder_id;
DROP INDEX IF EXISTS idx_media_items_folder;

-- Step 2: Drop media_folders table
DROP TABLE IF EXISTS media_folders;

-- Step 3: Create product_gallery join table
CREATE TABLE product_gallery (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    media_item_id UUID NOT NULL REFERENCES media_items(id) ON DELETE CASCADE,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(product_id, media_item_id)
);
CREATE INDEX idx_product_gallery_product ON product_gallery(product_id);

-- Step 4: Migrate product_images into media_items + product_gallery
INSERT INTO media_items (id, original_filename, storage_key, mime_type, file_size_bytes, alt_text, created_at, updated_at)
SELECT id, file_name, file_key, content_type, file_size_bytes, alt_text, created_at, created_at
FROM product_images
WHERE file_key IS NOT NULL
ON CONFLICT (id) DO NOTHING;

INSERT INTO product_gallery (product_id, media_item_id, sort_order, created_at)
SELECT product_id, id, sort_order, created_at
FROM product_images
WHERE file_key IS NOT NULL;

-- Step 5: Drop old product_images table
DROP TABLE IF EXISTS product_images;
