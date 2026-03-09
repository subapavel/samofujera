-- V002: Business tables for catalog, orders, memberships, pages, events, emails

-- 1. Product Categories
CREATE TABLE product_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Products
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    short_description VARCHAR(500),
    product_type VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    thumbnail_url TEXT,
    meta_title VARCHAR(255),
    meta_description VARCHAR(500),
    sku VARCHAR(100),
    badge VARCHAR(100),
    compare_price_czk NUMERIC(10,2),
    compare_price_eur NUMERIC(10,2),
    availability VARCHAR(20) NOT NULL DEFAULT 'hidden',
    stock_limit INT,
    weight_kg NUMERIC(8,3),
    og_image_url TEXT,
    variant_category_name VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_product_type ON products(product_type);
CREATE INDEX idx_products_availability ON products(availability);

-- 3. Product Prices
CREATE TABLE product_prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    currency VARCHAR(3) NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    UNIQUE(product_id, currency)
);

CREATE INDEX idx_product_prices_product_id ON product_prices(product_id);

-- 4. Product Category Assignments
CREATE TABLE product_category_assignments (
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES product_categories(id) ON DELETE CASCADE,
    PRIMARY KEY (product_id, category_id)
);

CREATE INDEX idx_pca_category_id ON product_category_assignments(category_id);

-- 5. Product Variants
CREATE TABLE product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(100) UNIQUE,
    stock INT NOT NULL DEFAULT 0,
    sort_order INT NOT NULL DEFAULT 0,
    availability VARCHAR(20) NOT NULL DEFAULT 'hidden',
    weight_kg NUMERIC(8,3),
    hidden BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_product_variants_product_id ON product_variants(product_id);

-- 6. Variant Prices
CREATE TABLE variant_prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
    currency VARCHAR(3) NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    UNIQUE(variant_id, currency)
);

CREATE INDEX idx_variant_prices_variant_id ON variant_prices(variant_id);

-- 7. Images
CREATE TABLE images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_filename VARCHAR(500),
    storage_key VARCHAR(500),
    mime_type VARCHAR(100),
    file_size_bytes BIGINT,
    alt_text TEXT,
    title VARCHAR(255),
    source VARCHAR(20) NOT NULL DEFAULT 'UPLOAD',
    is_public BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Product Gallery
CREATE TABLE product_gallery (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    image_id UUID NOT NULL REFERENCES images(id) ON DELETE CASCADE,
    sort_order INT NOT NULL DEFAULT 0,
    pan_x INT NOT NULL DEFAULT 50,
    pan_y INT NOT NULL DEFAULT 50,
    UNIQUE(product_id, image_id)
);

CREATE INDEX idx_product_gallery_product_id ON product_gallery(product_id);

-- 9. Product Content
CREATE TABLE product_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    content_type VARCHAR(20) NOT NULL,
    title VARCHAR(500),
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

CREATE INDEX idx_product_content_product_id ON product_content(product_id);

-- 10. Events
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    venue TEXT,
    capacity INT,
    is_online BOOLEAN NOT NULL DEFAULT true,
    stream_url TEXT,
    recording_product_id UUID REFERENCES products(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_events_product_id ON events(product_id);

-- 11. Event Occurrences
CREATE TABLE event_occurrences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED',
    stream_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_event_occurrences_event_id ON event_occurrences(event_id);
CREATE INDEX idx_event_occurrences_starts_at ON event_occurrences(starts_at);

-- 12. Pages (without published_revision_id FK - added after page_revisions)
CREATE TABLE pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(255) NOT NULL UNIQUE,
    title VARCHAR(500),
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    page_type VARCHAR(20) NOT NULL DEFAULT 'CUSTOM',
    content JSONB NOT NULL DEFAULT '{}',
    meta_title VARCHAR(200),
    meta_description VARCHAR(500),
    meta_keywords VARCHAR(300),
    og_title VARCHAR(200),
    og_description VARCHAR(500),
    og_image_id UUID REFERENCES images(id),
    noindex BOOLEAN NOT NULL DEFAULT false,
    nofollow BOOLEAN NOT NULL DEFAULT false,
    sort_order INT NOT NULL DEFAULT 0,
    show_in_nav BOOLEAN NOT NULL DEFAULT false,
    scheduled_publish_at TIMESTAMPTZ,
    published_revision_id UUID,
    product_id UUID REFERENCES products(id),
    created_by BIGINT REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    published_at TIMESTAMPTZ
);

CREATE INDEX idx_pages_status ON pages(status);
CREATE INDEX idx_pages_page_type ON pages(page_type);
CREATE INDEX idx_pages_product_id ON pages(product_id);

-- 13. Page Revisions
CREATE TABLE page_revisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    version INT NOT NULL,
    content JSONB,
    title VARCHAR(500),
    slug VARCHAR(255),
    meta_title VARCHAR(200),
    meta_description VARCHAR(500),
    meta_keywords VARCHAR(300),
    og_title VARCHAR(200),
    og_description VARCHAR(500),
    og_image_id UUID REFERENCES images(id),
    noindex BOOLEAN NOT NULL DEFAULT false,
    nofollow BOOLEAN NOT NULL DEFAULT false,
    created_by BIGINT REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(page_id, version)
);

CREATE INDEX idx_page_revisions_page_id ON page_revisions(page_id);

-- Add FK from pages.published_revision_id -> page_revisions.id
ALTER TABLE pages
    ADD CONSTRAINT fk_pages_published_revision
    FOREIGN KEY (published_revision_id) REFERENCES page_revisions(id);

-- 14. Orders
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id BIGINT REFERENCES users(id),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    total_amount NUMERIC(10,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'CZK',
    discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    stripe_payment_id TEXT,
    billing_address JSONB,
    shipping_address JSONB,
    locale VARCHAR(5) NOT NULL DEFAULT 'cs',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_stripe_payment_id ON orders(stripe_payment_id);

-- 15. Order Items
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    variant_id UUID,
    quantity INT NOT NULL DEFAULT 1,
    unit_price NUMERIC(10,2) NOT NULL,
    total_price NUMERIC(10,2) NOT NULL,
    product_snapshot JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_order_items_order_id ON order_items(order_id);

-- 16. Shipping Records
CREATE TABLE shipping_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    carrier VARCHAR(100),
    tracking_number VARCHAR(255),
    tracking_url TEXT,
    shipped_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_shipping_records_order_id ON shipping_records(order_id);

-- 17. Membership Plans
CREATE TABLE membership_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    stripe_price_id_czk VARCHAR(255),
    stripe_price_id_eur VARCHAR(255),
    features JSONB NOT NULL DEFAULT '{}',
    sort_order INT NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 18. Subscriptions
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id BIGINT NOT NULL REFERENCES users(id),
    plan_id UUID NOT NULL REFERENCES membership_plans(id),
    stripe_subscription_id VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_plan_id ON subscriptions(plan_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

-- 19. Entitlements
CREATE TABLE entitlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id BIGINT NOT NULL REFERENCES users(id),
    source_type VARCHAR(20) NOT NULL,
    source_id UUID,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    entity_type VARCHAR(30) NOT NULL,
    entity_id UUID
);

CREATE INDEX idx_entitlements_user_id ON entitlements(user_id);
CREATE INDEX idx_entitlements_entity ON entitlements(entity_type, entity_id);
CREATE INDEX idx_entitlements_source ON entitlements(source_type, source_id);

-- 20. Email Template Overrides
CREATE TABLE email_template_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_key VARCHAR(100) NOT NULL,
    locale VARCHAR(5) NOT NULL,
    custom_subject VARCHAR(500),
    custom_body_html TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(template_key, locale)
);
