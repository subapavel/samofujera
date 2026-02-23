-- Rename media_items -> images
ALTER TABLE media_items RENAME TO images;

-- Add title column
ALTER TABLE images ADD COLUMN title VARCHAR(500);

-- Rename FK columns in product_gallery
ALTER TABLE product_gallery RENAME COLUMN media_item_id TO image_id;

-- Rename FK columns in product_categories
ALTER TABLE product_categories RENAME COLUMN image_media_id TO image_id;

-- Rename index
ALTER INDEX idx_media_items_mime RENAME TO idx_images_mime;

-- Add pan offset columns to product_gallery
ALTER TABLE product_gallery ADD COLUMN pan_x INT NOT NULL DEFAULT 50;
ALTER TABLE product_gallery ADD COLUMN pan_y INT NOT NULL DEFAULT 50;

-- Add pan offset columns to product_categories
ALTER TABLE product_categories ADD COLUMN image_pan_x INT NOT NULL DEFAULT 50;
ALTER TABLE product_categories ADD COLUMN image_pan_y INT NOT NULL DEFAULT 50;
