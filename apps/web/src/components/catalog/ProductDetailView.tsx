"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { t } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import type { ProductDetailResponse } from "@samofujera/api-client";
import { formatPrice, formatPrices, primaryPrice, productTypeDescriptor } from "./utils";

interface ProductDetailViewProps {
  product: ProductDetailResponse | null;
}

export function ProductDetailView({ product }: ProductDetailViewProps) {
  const { _ } = useLingui();
  const searchParams = useSearchParams();
  const fromUrl = searchParams.get("from");

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);

  if (!product) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">{t`Produkt nebyl nalezen`}</h1>
        <p className="text-[var(--muted-foreground)] mb-8">
          {t`Omlouváme se, tento produkt neexistuje nebo byl odstraněn.`}
        </p>
        <Link href="/" className="btn-style2">
          {t`Zpět na hlavní stránku`}
        </Link>
      </div>
    );
  }

  const images = product.images?.length
    ? [...product.images].sort((a, b) => a.sortOrder - b.sortOrder)
    : [];
  const currentImage = images[selectedImageIndex] || null;
  const price = primaryPrice(product.prices);
  const hasVariants = product.variants && product.variants.length > 0;
  const isPhysical = product.productType === "PHYSICAL";

  const selectedVariant = hasVariants && selectedVariantId
    ? product.variants!.find((v) => v.id === selectedVariantId)
    : null;

  const displayPrice = selectedVariant
    ? primaryPrice(selectedVariant.prices)
    : price;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
      {/* Breadcrumb */}
      <nav className="mb-8 text-sm text-[var(--muted-foreground)]">
        {fromUrl ? (
          <Link
            href={fromUrl}
            className="hover:text-[var(--foreground)] transition-colors"
          >
            {t`Produkty`}
          </Link>
        ) : (
          <span>{t`Produkty`}</span>
        )}
        <span className="mx-2">/</span>
        <span className="text-[var(--foreground)]">{product.title}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Left column: Images */}
        <div className="space-y-4">
          {/* Main image */}
          <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-[var(--muted)]">
            {currentImage ? (
              <Image
                src={currentImage.url}
                alt={currentImage.altText || product.title}
                fill
                className="object-cover"
                style={{
                  objectPosition: `${currentImage.panX}% ${currentImage.panY}%`,
                }}
                sizes="(max-width: 1024px) 100vw, 50vw"
                priority
              />
            ) : product.thumbnailUrl ? (
              <Image
                src={product.thumbnailUrl}
                alt={product.title}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
                priority
              />
            ) : (
              <div className="flex h-full items-center justify-center text-[var(--muted-foreground)]">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="64"
                  height="64"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                  <circle cx="9" cy="9" r="2" />
                  <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                </svg>
              </div>
            )}
          </div>

          {/* Thumbnails */}
          {images.length > 1 && (
            <div className="grid grid-cols-5 gap-2">
              {images.map((img, index) => (
                <button
                  key={img.imageId}
                  type="button"
                  onClick={() => setSelectedImageIndex(index)}
                  className={`relative aspect-square overflow-hidden rounded-md bg-[var(--muted)] transition-all ${
                    index === selectedImageIndex
                      ? "ring-2 ring-[var(--primary)] ring-offset-2"
                      : "opacity-70 hover:opacity-100"
                  }`}
                >
                  <Image
                    src={img.url}
                    alt={img.altText || `${product.title} ${index + 1}`}
                    fill
                    className="object-cover"
                    style={{
                      objectPosition: `${img.panX}% ${img.panY}%`,
                    }}
                    sizes="10vw"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right column: Product info */}
        <div className="space-y-6">
          {/* Product type + categories */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-block rounded-full bg-[var(--secondary)] px-3 py-1 text-xs font-medium text-[var(--secondary-foreground)]">
              {_(productTypeDescriptor(product.productType))}
            </span>
            {product.categories?.map((cat) => (
              <span
                key={cat.id}
                className="inline-block rounded-full border border-[var(--border)] px-3 py-1 text-xs text-[var(--muted-foreground)]"
              >
                {cat.name}
              </span>
            ))}
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold leading-tight sm:text-4xl">
            {product.title}
          </h1>

          {/* Short description */}
          {product.shortDescription && (
            <p className="text-lg text-[var(--muted-foreground)] leading-relaxed">
              {product.shortDescription}
            </p>
          )}

          {/* Price */}
          <div className="space-y-1">
            <p className="text-3xl font-bold text-[var(--primary)]">
              {displayPrice
                ? formatPrice(displayPrice.amount, displayPrice.currency)
                : formatPrices(product.prices)}
            </p>
            {Object.keys(product.prices).length > 1 && (
              <p className="text-sm text-[var(--muted-foreground)]">
                {formatPrices(product.prices)}
              </p>
            )}
          </div>

          {/* Variant selector for physical products */}
          {isPhysical && hasVariants && (
            <div className="space-y-2">
              <label
                htmlFor="variant-select"
                className="block text-sm font-medium"
              >
                {t`Varianta`}
              </label>
              <select
                id="variant-select"
                value={selectedVariantId || ""}
                onChange={(e) =>
                  setSelectedVariantId(e.target.value || null)
                }
                className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              >
                <option value="">{t`Vyberte variantu`}</option>
                {product.variants!.map((variant) => (
                  <option key={variant.id} value={variant.id}>
                    {variant.name}
                    {variant.stock <= 0 ? ` (${t`Vyprodáno`})` : ""}
                  </option>
                ))}
              </select>
              {selectedVariant && selectedVariant.stock <= 0 && (
                <p className="text-sm text-[var(--destructive)]">
                  {t`Tato varianta je momentálně vyprodána.`}
                </p>
              )}
            </div>
          )}

          {/* Buy button */}
          <Link
            href="/pokladna"
            className="btn-style4 w-full justify-center text-center"
          >
            {t`Koupit`}
          </Link>

          {/* Full description */}
          {product.description && (
            <div className="border-t border-[var(--border)] pt-6">
              <h2 className="mb-3 text-lg font-semibold">{t`Popis`}</h2>
              <div className="prose max-w-none text-[var(--foreground)] leading-relaxed whitespace-pre-wrap">
                {product.description}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
