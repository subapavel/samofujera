ALTER TABLE pages ADD COLUMN product_id UUID REFERENCES products(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX idx_pages_product_id ON pages(product_id) WHERE product_id IS NOT NULL;
