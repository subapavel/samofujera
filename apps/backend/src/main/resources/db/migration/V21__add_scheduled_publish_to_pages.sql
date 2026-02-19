ALTER TABLE pages ADD COLUMN scheduled_publish_at TIMESTAMPTZ;

CREATE INDEX idx_pages_scheduled_publish ON pages(scheduled_publish_at)
    WHERE scheduled_publish_at IS NOT NULL AND status = 'DRAFT';
