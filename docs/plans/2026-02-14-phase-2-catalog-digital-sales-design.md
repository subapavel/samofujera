# Phase 2: Catalog & Digital Sales — Design

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:writing-plans to create the implementation plan.

**Goal:** Build a complete digital product sales system — catalog, checkout via Stripe, entitlement-based access, file delivery via R2 signed URLs, admin product management, and customer library.

**Architecture:** Spring Modulith backend with 5 new modules (catalog, order, payment, entitlement, delivery) communicating via domain events. Single Astro app with React client-side fetching for catalog pages (no rebuild needed for product changes). Stripe Checkout for payments, Cloudflare R2 for file storage.

**Tech Stack:** Spring Boot 4, JOOQ, Stripe Java SDK, Cloudflare R2 (S3-compatible presigned URLs), TanStack Query/Router (frontend).

---

## Architecture Overview

### Backend Modules

```
cz.samofujera.catalog/          — Products, categories, digital assets CRUD
cz.samofujera.order/            — Order creation, lifecycle management
cz.samofujera.payment/          — Stripe checkout sessions, webhook handling
cz.samofujera.entitlement/      — Access control (grant, hasAccess, revoke)
cz.samofujera.delivery/         — Signed R2 URLs, download tracking, rate limiting
```

Each module follows Spring Modulith conventions:
- Public API at module root (service + DTOs/records)
- `internal/` package for repositories, implementation details
- `event/` package for domain events

### Event Flow

```
Stripe webhook (checkout.session.completed)
  → PaymentService marks Order as PAID
  → Publishes OrderPaidEvent
      → EntitlementService.grantAccess() for each item
      → EmailService sends order confirmation
      → EmailService sends digital delivery instructions
```

---

## Database Schema

### V6 — Categories

```sql
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    parent_id UUID REFERENCES categories(id),
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### V7 — Products

```sql
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    short_description VARCHAR(500),
    product_type VARCHAR(20) NOT NULL,  -- DIGITAL, STREAMING, PHYSICAL, EVENT
    price_amount NUMERIC(10,2) NOT NULL,
    price_currency VARCHAR(3) NOT NULL DEFAULT 'CZK',
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',  -- DRAFT, ACTIVE, ARCHIVED
    thumbnail_url TEXT,
    category_id UUID REFERENCES categories(id),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_status ON products(status);
```

### V8 — Digital Assets

```sql
CREATE TABLE digital_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id),
    asset_type VARCHAR(50) NOT NULL,  -- PDF, MP3, ZIP, VIDEO, etc.
    file_key TEXT NOT NULL,            -- R2 object key
    file_name VARCHAR(255) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    stream_uid TEXT,                    -- Cloudflare Stream UID (video only)
    duration_seconds INT,              -- Video/audio duration
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_digital_assets_product ON digital_assets(product_id);
```

### V9 — Orders

```sql
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',  -- PENDING, PAID, CANCELLED, REFUNDED
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
```

### V10 — Order Items

```sql
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id),
    product_id UUID NOT NULL REFERENCES products(id),
    variant_id UUID,
    quantity INT NOT NULL DEFAULT 1,
    unit_price NUMERIC(10,2) NOT NULL,
    total_price NUMERIC(10,2) NOT NULL,
    product_snapshot JSONB NOT NULL,  -- Preserves product data at purchase time
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_order_items_order ON order_items(order_id);
```

### V11 — Entitlements

```sql
CREATE TABLE entitlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    product_id UUID NOT NULL REFERENCES products(id),
    source_type VARCHAR(20) NOT NULL,  -- PURCHASE, SUBSCRIPTION, VOUCHER, ADMIN
    source_id UUID NOT NULL,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ,  -- NULL = permanent
    revoked_at TIMESTAMPTZ   -- NULL = active
);

CREATE INDEX idx_entitlements_access
    ON entitlements(user_id, product_id)
    WHERE revoked_at IS NULL;
```

### V12 — Download Logs

```sql
CREATE TABLE download_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    asset_id UUID NOT NULL REFERENCES digital_assets(id),
    ip_address VARCHAR(45) NOT NULL,
    user_agent TEXT,
    downloaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_download_logs_user_asset ON download_logs(user_id, asset_id);
```

### V13 — Shipping Records

```sql
CREATE TABLE shipping_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id),
    carrier VARCHAR(100),
    tracking_number VARCHAR(255),
    tracking_url TEXT,
    shipped_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_shipping_records_order ON shipping_records(order_id);
```

---

## API Endpoints

### Public (No Authentication)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/catalog/products` | Paginated product list. Query: page, limit, category, type, sort, search |
| GET | `/api/catalog/products/{slug}` | Product detail with asset list (no download URLs) |
| GET | `/api/catalog/categories` | Hierarchical category tree |

### Customer (Authenticated)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/checkout` | Create Stripe Checkout Session → returns checkoutUrl + orderId |
| GET | `/api/orders` | My orders (paginated) |
| GET | `/api/orders/{id}` | Order detail with items and shipping |
| GET | `/api/library` | My purchased products (via entitlements) |
| GET | `/api/library/{productId}/assets` | Assets for a product I own |
| GET | `/api/delivery/download/{assetId}` | Generate signed R2 URL (rate limited: 5/hour/user) |

### Admin (ROLE_ADMIN)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/admin/products` | Create product |
| PUT | `/api/admin/products/{id}` | Update product |
| DELETE | `/api/admin/products/{id}` | Soft delete product (ARCHIVED) |
| POST | `/api/admin/products/{id}/assets` | Upload asset to R2 |
| DELETE | `/api/admin/products/{id}/assets/{aid}` | Remove asset |
| GET | `/api/admin/orders` | All orders (paginated, filterable) |
| GET | `/api/admin/orders/{id}` | Order detail |
| PUT | `/api/admin/orders/{id}/shipping` | Add/update shipping tracking |
| POST | `/api/admin/categories` | Create category |
| PUT | `/api/admin/categories/{id}` | Update category |
| DELETE | `/api/admin/categories/{id}` | Delete category |

### Stripe Webhook

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/stripe/webhook` | Handles `checkout.session.completed`, verified by Stripe signature |

---

## Stripe Integration

### Checkout Flow

1. Frontend sends `POST /api/checkout` with `{ items: [{productId, quantity}], voucherCode? }`
2. Backend validates products (exist, ACTIVE, in stock for physical)
3. Backend creates `Order` with status PENDING
4. Backend creates Stripe Checkout Session:
   - `mode: PAYMENT`
   - `client_reference_id: orderId`
   - `success_url: /pokladna/uspech?session_id={CHECKOUT_SESSION_ID}`
   - `cancel_url: /pokladna/zruseno`
   - Line items from order
   - Discount coupon if voucher applied
5. Returns `{ checkoutUrl, orderId }` → frontend redirects to Stripe
6. After payment, Stripe sends webhook to `/api/stripe/webhook`
7. Webhook handler: update order → PAID, publish `OrderPaidEvent`

### Stripe Configuration

- **Test mode** keys during development
- Secrets on Fly.io: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- Products created dynamically (price_data in checkout session), not pre-created in Stripe dashboard

---

## Frontend

### Catalog Pages (Astro + React client-side fetching)

- `/katalog/` — static Astro shell, React component fetches products from API with category filter, search, pagination
- `/katalog/[slug]` — static Astro shell with `getStaticPaths` returning `[{ params: { slug: undefined } }]`, React fetches product by slug from URL. CF Pages `_redirects` handles all sub-paths.

### Checkout Pages (Astro static)

- `/pokladna/uspech` — success confirmation, shows order summary
- `/pokladna/zruseno` — cancelled, link back to catalog

### Admin Routes (React SPA at /admin)

- `/admin/produkty` — product DataTable with status/type filters
- `/admin/produkty/novy` — create product form (title, description, price, type, category, thumbnail)
- `/admin/produkty/{id}` — edit product + asset upload/management section
- `/admin/kategorie` — category management (tree view)
- `/admin/objednavky` — orders DataTable with status filter
- `/admin/objednavky/{id}` — order detail + shipping form for physical products

### Customer Routes (React SPA at /muj-ucet)

- `/muj-ucet/knihovna` — grid of purchased products
- `/muj-ucet/knihovna/{productId}` — product detail with download buttons / stream player
- `/muj-ucet/objednavky` — order history
- `/muj-ucet/objednavky/{id}` — order detail with status, tracking

---

## R2 File Storage

### Upload Flow (Admin)

1. Admin uploads file via `POST /api/admin/products/{id}/assets`
2. Backend streams file to R2 bucket `samofujera-assets` with key `products/{productId}/{uuid}/{fileName}`
3. Creates `digital_assets` record with file metadata

### Download Flow (Customer)

1. Customer clicks download → `GET /api/delivery/download/{assetId}`
2. Backend checks: authenticated → has entitlement → rate limit (Redis, 5/hour/user)
3. Generates R2 presigned GET URL (TTL: 15 minutes)
4. Logs to `download_logs`
5. Returns `{ downloadUrl, fileName, fileSize }`
6. Frontend triggers download via the signed URL

---

## Email Templates

| Template | Trigger | Content |
|----------|---------|---------|
| order-confirmation | OrderPaidEvent | Order summary, items, total, payment confirmation |
| digital-delivery | EntitlementGrantedEvent (for digital products) | Access instructions, link to /muj-ucet/knihovna |

---

## Testing Strategy

### Backend

- **Unit tests**: Service layer mocks for each module
- **Integration tests**: Testcontainers (Postgres + Redis)
  - Full checkout flow: create order → mock Stripe webhook → verify entitlement granted
  - Download flow: verify presigned URL generation, rate limiting
  - JOOQ repository tests with real DB
- **Stripe tests**: Mock webhook payloads with test fixtures, verify signature validation

### Frontend

- **Vitest**: React components (ProductCard, CheckoutButton, DownloadButton)
- **E2E (Playwright)**: Full purchase flow using Stripe test mode (card 4242...)

---

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Client-side fetching for catalog | 50+ products, avoid rebuild on every product change |
| Full schema including shipping + vouchers | Avoid future migrations that alter core tables |
| Dynamic Stripe prices (not pre-created) | Products managed in our DB, not Stripe dashboard |
| R2 presigned URLs (not proxy) | Backend generates URL, client downloads directly from R2. No bandwidth through backend. |
| Rate limiting via Redis | 5 downloads/hour/user, simple counter with TTL |
| Product snapshot in order_items | Preserves price/title at purchase time even if product changes later |
