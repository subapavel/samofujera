-- ============================================================
-- V15: Rebuild product model
-- Drops old tables and recreates with multi-currency pricing,
-- type-specific detail tables, and event support.
-- ============================================================

-- Drop dependent tables first (FK order)
DROP TABLE IF EXISTS download_logs CASCADE;
DROP TABLE IF EXISTS shipping_records CASCADE;
DROP TABLE IF EXISTS entitlements CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS digital_assets CASCADE;
DROP TABLE IF EXISTS products CASCADE;

-- ============================================================
-- PRODUCTS (base table — no price columns)
-- ============================================================
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    short_description VARCHAR(500),
    product_type VARCHAR(20) NOT NULL
        CHECK (product_type IN ('PHYSICAL', 'EBOOK', 'AUDIO_VIDEO', 'ONLINE_EVENT', 'RECURRING_EVENT', 'OFFLINE_EVENT')),
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT'
        CHECK (status IN ('DRAFT', 'ACTIVE', 'ARCHIVED')),
    thumbnail_url TEXT,
    category_id UUID REFERENCES categories(id),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_type ON products(product_type);

-- ============================================================
-- PRODUCT_PRICES (multi-currency)
-- ============================================================
CREATE TABLE product_prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    currency VARCHAR(3) NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (product_id, currency)
);

CREATE INDEX idx_product_prices_product ON product_prices(product_id);

-- ============================================================
-- PRODUCT_VARIANTS (PHYSICAL products)
-- ============================================================
CREATE TABLE product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(100) NOT NULL UNIQUE,
    stock INT NOT NULL DEFAULT 0,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_product_variants_product ON product_variants(product_id);

-- ============================================================
-- VARIANT_PRICES (multi-currency for variants)
-- ============================================================
CREATE TABLE variant_prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
    currency VARCHAR(3) NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (variant_id, currency)
);

CREATE INDEX idx_variant_prices_variant ON variant_prices(variant_id);

-- ============================================================
-- PRODUCT_FILES (EBOOK — replaces digital_assets)
-- ============================================================
CREATE TABLE product_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    file_key TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_product_files_product ON product_files(product_id);

-- ============================================================
-- PRODUCT_MEDIA (AUDIO_VIDEO)
-- ============================================================
CREATE TABLE product_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    media_type VARCHAR(10) NOT NULL
        CHECK (media_type IN ('VIDEO', 'AUDIO')),
    cf_stream_uid TEXT,
    file_key TEXT,
    duration_seconds INT,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_product_media_product ON product_media(product_id);

-- ============================================================
-- EVENTS (ONLINE_EVENT, RECURRING_EVENT, OFFLINE_EVENT)
-- ============================================================
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

CREATE INDEX idx_events_product ON events(product_id);

-- ============================================================
-- EVENT_OCCURRENCES
-- ============================================================
CREATE TABLE event_occurrences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED'
        CHECK (status IN ('SCHEDULED', 'LIVE', 'COMPLETED', 'CANCELLED')),
    stream_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_event_occurrences_event ON event_occurrences(event_id);
CREATE INDEX idx_event_occurrences_starts ON event_occurrences(starts_at);

-- ============================================================
-- ORDERS (recreated — same schema)
-- ============================================================
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    total_amount NUMERIC(10,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'CZK',
    voucher_id UUID,
    discount_amount NUMERIC(10,2) DEFAULT 0,
    stripe_payment_id TEXT,
    stripe_invoice_id TEXT,
    billing_address JSONB,
    shipping_address JSONB,
    locale VARCHAR(5) NOT NULL DEFAULT 'cs',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_orders_user ON orders(user_id, created_at DESC);
CREATE INDEX idx_orders_status ON orders(status);

-- ============================================================
-- ORDER_ITEMS (variant_id now FK to product_variants)
-- ============================================================
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id),
    product_id UUID NOT NULL REFERENCES products(id),
    variant_id UUID REFERENCES product_variants(id),
    quantity INT NOT NULL DEFAULT 1,
    unit_price NUMERIC(10,2) NOT NULL,
    total_price NUMERIC(10,2) NOT NULL,
    product_snapshot JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_order_items_order ON order_items(order_id);

-- ============================================================
-- ENTITLEMENTS (add optional event_occurrence_id)
-- ============================================================
CREATE TABLE entitlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    product_id UUID NOT NULL REFERENCES products(id),
    event_occurrence_id UUID REFERENCES event_occurrences(id),
    source_type VARCHAR(20) NOT NULL,
    source_id UUID NOT NULL,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ
);

CREATE INDEX idx_entitlements_access
    ON entitlements(user_id, product_id)
    WHERE revoked_at IS NULL;

-- ============================================================
-- DOWNLOAD_LOGS (FK to product_files instead of digital_assets)
-- ============================================================
CREATE TABLE download_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    file_id UUID NOT NULL REFERENCES product_files(id),
    ip_address VARCHAR(45) NOT NULL,
    user_agent TEXT,
    downloaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_download_logs_user_file ON download_logs(user_id, file_id);

-- ============================================================
-- SHIPPING_RECORDS (same schema)
-- ============================================================
CREATE TABLE shipping_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id),
    carrier VARCHAR(100),
    tracking_number VARCHAR(255),
    tracking_url TEXT,
    shipped_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_shipping_records_order_id UNIQUE (order_id)
);

CREATE INDEX idx_shipping_records_order ON shipping_records(order_id);
