CREATE TABLE lead_captures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    entity_type VARCHAR(30) NOT NULL,
    entity_id UUID NOT NULL,
    email VARCHAR(320) NOT NULL,
    utm_source VARCHAR(255),
    utm_medium VARCHAR(255),
    utm_campaign VARCHAR(255),
    utm_content VARCHAR(255),
    referrer_url VARCHAR(2000),
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lead_captures_entity ON lead_captures(entity_type, entity_id);
CREATE INDEX idx_lead_captures_email ON lead_captures(email);

-- Add UNLISTED to products status constraint
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_status_check;
ALTER TABLE products ADD CONSTRAINT products_status_check
    CHECK (status IN ('DRAFT', 'ACTIVE', 'ARCHIVED', 'UNLISTED'));

-- Add promo video URL
ALTER TABLE products ADD COLUMN promo_video_url VARCHAR(2000);
