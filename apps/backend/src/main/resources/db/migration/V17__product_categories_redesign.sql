-- ============================================================
-- V17: Product categories redesign
-- Flat product_categories table (no parent_id), many-to-many
-- assignments, SEO fields on products, drop old categories.
-- ============================================================

-- 1. Create new product_categories table (flat, no hierarchy)
CREATE TABLE product_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    image_url TEXT,
    meta_title VARCHAR(255),
    meta_description VARCHAR(500),
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_product_categories_slug ON product_categories(slug);
CREATE INDEX idx_product_categories_sort ON product_categories(sort_order);

-- 2. Migrate data from old categories table (ignore parent_id)
INSERT INTO product_categories (id, name, slug, sort_order, created_at, updated_at)
SELECT id, name, slug, sort_order, created_at, updated_at
FROM categories;

-- 3. Create many-to-many join table
CREATE TABLE product_category_assignments (
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES product_categories(id) ON DELETE CASCADE,
    PRIMARY KEY (product_id, category_id)
);

CREATE INDEX idx_pca_product ON product_category_assignments(product_id);
CREATE INDEX idx_pca_category ON product_category_assignments(category_id);

-- 4. Populate assignments from existing products.category_id
INSERT INTO product_category_assignments (product_id, category_id)
SELECT id, category_id
FROM products
WHERE category_id IS NOT NULL;

-- 5. Add SEO fields to products
ALTER TABLE products ADD COLUMN meta_title VARCHAR(255);
ALTER TABLE products ADD COLUMN meta_description VARCHAR(500);

-- 6. Drop old category_id column and its index from products
DROP INDEX IF EXISTS idx_products_category;
ALTER TABLE products DROP COLUMN category_id;

-- 7. Drop old categories table
DROP TABLE categories;
