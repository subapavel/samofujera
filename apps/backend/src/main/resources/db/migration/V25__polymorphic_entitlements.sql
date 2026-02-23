-- Add polymorphic columns
ALTER TABLE entitlements ADD COLUMN entity_type VARCHAR(30);
ALTER TABLE entitlements ADD COLUMN entity_id UUID;

-- Migrate existing data (all are product-based)
UPDATE entitlements SET entity_type = 'PRODUCT', entity_id = product_id;

-- Make NOT NULL
ALTER TABLE entitlements ALTER COLUMN entity_type SET NOT NULL;
ALTER TABLE entitlements ALTER COLUMN entity_id SET NOT NULL;

-- Drop old columns and index
DROP INDEX IF EXISTS idx_entitlements_access;
ALTER TABLE entitlements DROP COLUMN product_id;
ALTER TABLE entitlements DROP COLUMN event_occurrence_id;

-- New index
CREATE INDEX idx_entitlements_access
    ON entitlements(user_id, entity_type, entity_id)
    WHERE revoked_at IS NULL;
