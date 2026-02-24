# Physical Product Form Redesign — Design

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:writing-plans to create the implementation plan.

**Goal:** Restructure the PHYSICAL product creation/edit form to match Webnode's tabbed layout with new fields for inventory, promotions, shipping, and enhanced variants.

**Scope:** PHYSICAL product type only. Other types (EBOOK, AUDIO_VIDEO, events) keep their current form layout unchanged.

---

## Tab Structure

The form for PHYSICAL products has 6 tabs:

| Tab | Content |
|-----|---------|
| **Produkt** | Title, price (CZK), unit price toggle, short description, full description (Lexical rich text editor), category checkboxes |
| **Galerie** | Existing gallery tab (unchanged — drag-drop images, upload, alt text, reorder) |
| **Sklad** | Availability dropdown, stock limit, SKU, shipping: weight + dimensions |
| **Podpora prodeje** | Product badge label, compare-at (original) price |
| **Varianty** | Variant category name, tag-based variant creation, per-variant settings table |
| **Pokročilé** | SEO: meta title, meta description, OG image, search engine preview |

---

## Tab Details

### Produkt Tab

- **Název produktu** — text input (required), placeholder "Např. Starožitné hodiny - kukačky"
- **Cena** — number input with "Kč" suffix, step 0.01
- **Zobrazit cenu za jednotku** — checkbox with tooltip (shows unit price, e.g. "125 Kč/kg")
- **Krátký popisek** — textarea (max 500 chars)
- **Popis** — Lexical rich text editor (same as page editor text blocks), replaces current plain textarea
- **Kategorie** — checkbox list of existing categories + "+ Přidat novou kategorii" link (existing behavior)

### Galerie Tab

Unchanged from current implementation. Drag-drop image management with upload, library linking, alt text editing, reorder.

### Sklad Tab

**Správa skladu section:**
- **Dostupnost** — dropdown: Nezobrazovat (hidden), Skladem (in_stock), Není skladem (out_of_stock), Na objednávku (preorder)
- **Omezit dostupnost** — checkbox + quantity input ("ks" suffix). When checked, limits available stock.
- **Produktové číslo** — text input for SKU/product number

**Doprava section:**
- **Váha** — number input with "kg" suffix, step 0.001
- **Rozměry (Šířka × Délka × Výška)** — three number inputs with "cm" suffix, step 0.01

### Podpora prodeje Tab

- **Štítek produktu** — text input, placeholder "např. Novinka". Displayed as badge on product cards.
- **Původní cena** — number input with "Kč" suffix. When set, displayed as strikethrough price next to current price.

### Varianty Tab

**Empty state:** Illustration + "Tvorba variant" heading + description text + "Vytvořit první variantu" button.

**Creation flow (Tvorba variant):**
1. **Kategorie variant** — text input for variant group name (e.g. "Díly", "Velikosti", "Barvy")
2. **Varianty produktu** — tag input where each entered value becomes a chip with × to remove. Typing + Enter adds a new variant tag.

**Settings table (Nastavení variant):**
One row per variant with columns:
- Variant name (read-only label from tag)
- **Cena s DPH** — price in CZK
- **Omezit dostupnost** — stock quantity in ks
- **Dostupnost** — dropdown (Nezobrazovat, Skladem, Není skladem)
- **Produktové číslo** — SKU per variant
- **Váha** — weight in kg
- **Skrýt** — checkbox to hide variant

### Pokročilé Tab

**SEO nastavení stránky:**
- **Titulek stránky** (meta title, max 255 chars)
- **URL identifikátor stránky** (slug, auto-generated from title)
- **Popisek stránky** (meta description, max 500 chars)
- **OG obrázek** — image upload/select for Open Graph sharing image
- **Náhled ve vyhledávači** — live preview showing Google search result appearance (title, URL, description). Same pattern as page editor SEO preview.

---

## Database Changes

### Migration: Add physical product fields to `products`

```sql
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
```

### Migration: Enhance `product_variants`

```sql
ALTER TABLE product_variants ADD COLUMN availability VARCHAR(20) DEFAULT 'hidden';
ALTER TABLE product_variants ADD COLUMN weight_kg NUMERIC(8,3);
ALTER TABLE product_variants ADD COLUMN hidden BOOLEAN DEFAULT false;
```

### Availability Values

| Value | Czech Label | Meaning |
|-------|-------------|---------|
| `hidden` | Nezobrazovat | Don't show availability |
| `in_stock` | Skladem | Available |
| `out_of_stock` | Není skladem | Out of stock |
| `preorder` | Na objednávku | Available on order |

---

## Backend Changes

### Updated DTOs

`CreateProductRequest` / `UpdateProductRequest` gain fields:
- `sku`, `badge`, `comparePriceCzk`, `comparePriceEur`
- `availability`, `stockLimit`
- `weightKg`, `dimensionWidthCm`, `dimensionLengthCm`, `dimensionHeightCm`
- `unitPriceEnabled`, `ogImageUrl`
- `variantCategoryName`

`CreateVariantRequest` gains:
- `availability`, `weightKg`, `hidden`

Product response DTOs updated to include all new fields.

### JOOQ Regeneration

After migration, regenerate JOOQ classes to pick up new columns.

---

## Frontend Changes

### Modified Files

- `product-edit-dialog.tsx` — restructure tabs for PHYSICAL type: Produkt, Galerie, Sklad, Podpora prodeje, Varianty, Pokročilé
- `product-create-dialog.tsx` — same tab structure for new PHYSICAL products
- Zod validation schema — add new field validations
- Form state management — add new fields to React Hook Form

### New Components (inside `apps/web/src/components/admin/products/`)

- `sklad-tab.tsx` — Inventory/warehouse management fields
- `podpora-prodeje-tab.tsx` — Promotional fields (badge, compare price)
- `pokrocile-tab.tsx` — Enhanced SEO with OG image and search preview
- `variant-tag-input.tsx` — Tag-based variant creation component
- `variant-settings-table.tsx` — Enhanced variant settings table

### Updated Components

- `product-content-tab.tsx` — Replace plain textarea description with Lexical editor
- Variant tab — Replace current inline table with Webnode-style: empty state → category + tags → settings table

### API Client

Update `CreateProductRequest` and `UpdateProductRequest` types in `packages/api-client/src/types.ts` with all new fields.

---

## Form Behavior

- **PHYSICAL products only** — other types keep current layout
- **Create vs. Edit** — same tab structure, "Vytvořit"/"Uložit" button at bottom-right, "Zavřít" at bottom-left
- **Description** — uses Lexical rich text editor (same toolbar and formatting as page editor text blocks)
- **Variant interaction** — when variants exist, Sklad tab fields become defaults; variants can override price, stock, SKU, weight individually
- **SEO preview** — live Google search result preview using meta title (or product title fallback), slug URL, and meta description

---

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| PHYSICAL type only | Other types have different needs; avoid scope creep |
| Gallery stays as separate tab | Better UX for managing many product images |
| Lexical editor for description | Rich text consistency with page editor |
| Availability as enum, not boolean | Matches Webnode's 4-state model |
| Compare price per currency | Both CZK and EUR markets need strikethrough prices |
| Variant category name on product | Simple — one variant dimension per product (like Webnode) |
| OG image on Pokročilé tab | Matches page editor pattern for SEO sharing |
