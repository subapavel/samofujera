-- Physical product fields on products table
ALTER TABLE products ADD COLUMN sku VARCHAR(100);
ALTER TABLE products ADD COLUMN badge VARCHAR(100);
ALTER TABLE products ADD COLUMN compare_price_czk NUMERIC(10,2);
ALTER TABLE products ADD COLUMN compare_price_eur NUMERIC(10,2);
ALTER TABLE products ADD COLUMN availability VARCHAR(20) DEFAULT 'hidden';
ALTER TABLE products ADD COLUMN stock_limit INTEGER;
ALTER TABLE products ADD COLUMN weight_kg NUMERIC(8,3);
ALTER TABLE products ADD COLUMN dimension_width_cm NUMERIC(8,2);
ALTER TABLE products ADD COLUMN dimension_length_cm NUMERIC(8,2);
ALTER TABLE products ADD COLUMN dimension_height_cm NUMERIC(8,2);
ALTER TABLE products ADD COLUMN unit_price_enabled BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN og_image_url TEXT;
ALTER TABLE products ADD COLUMN variant_category_name VARCHAR(255);

-- Enhanced variant fields
ALTER TABLE product_variants ADD COLUMN availability VARCHAR(20) DEFAULT 'hidden';
ALTER TABLE product_variants ADD COLUMN weight_kg NUMERIC(8,3);
ALTER TABLE product_variants ADD COLUMN hidden BOOLEAN DEFAULT false;
