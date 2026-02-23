-- Create unified product_content table
CREATE TABLE product_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    content_type VARCHAR(20) NOT NULL CHECK (content_type IN ('FILE', 'VIDEO', 'AUDIO')),
    title VARCHAR(500) NOT NULL,
    is_preview BOOLEAN NOT NULL DEFAULT false,
    storage_key VARCHAR(500),
    original_filename VARCHAR(500),
    mime_type VARCHAR(100),
    file_size_bytes BIGINT,
    stream_uid VARCHAR(255),
    duration_seconds INT,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_product_content_product ON product_content(product_id);

-- Migrate product_files -> product_content
INSERT INTO product_content (id, product_id, content_type, title, is_preview,
    storage_key, original_filename, mime_type, file_size_bytes, sort_order, created_at)
SELECT id, product_id, 'FILE', file_name, false,
    file_key, file_name, mime_type, file_size_bytes, sort_order, created_at
FROM product_files;

-- Migrate product_media -> product_content
INSERT INTO product_content (id, product_id, content_type, title, is_preview,
    storage_key, original_filename, mime_type, file_size_bytes,
    stream_uid, duration_seconds, sort_order, created_at)
SELECT id, product_id,
    CASE WHEN media_type = 'VIDEO' THEN 'VIDEO' ELSE 'AUDIO' END,
    title, false,
    file_key, NULL, NULL, NULL,
    cf_stream_uid, duration_seconds, sort_order, created_at
FROM product_media;

-- Update download_logs FK
ALTER TABLE download_logs DROP CONSTRAINT IF EXISTS download_logs_file_id_fkey;
ALTER TABLE download_logs RENAME COLUMN file_id TO content_id;
ALTER TABLE download_logs ADD CONSTRAINT download_logs_content_id_fkey
    FOREIGN KEY (content_id) REFERENCES product_content(id);

-- Drop old tables
DROP TABLE IF EXISTS product_files;
DROP TABLE IF EXISTS product_media;
DROP TABLE IF EXISTS digital_assets;
