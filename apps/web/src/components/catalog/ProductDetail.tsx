"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { t } from "@lingui/core/macro";
import type { ProductDetailResponse } from "@samofujera/api-client";
import { formatPrice, formatPrices, primaryPrice } from "./utils";
import { renderLexicalContent } from "@/components/page-renderer/PageRenderer";

interface ProductDetailProps {
  product: ProductDetailResponse;
}

export function ProductDetail({ product }: ProductDetailProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);

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
    <div className="product-detail">
      <div className="product-detail-grid">
        {/* Left column: Images */}
        <div className="product-detail-images">
          <div className="product-detail-main-image">
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

          {images.length > 1 && (
            <div className="product-detail-thumbnails">
              {images.map((img, index) => (
                <button
                  key={img.imageId}
                  type="button"
                  onClick={() => setSelectedImageIndex(index)}
                  className={`product-detail-thumbnail${
                    index === selectedImageIndex
                      ? " product-detail-thumbnail-active"
                      : ""
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
        <div className="product-detail-info">
          {product.categories && product.categories.length > 0 && (
            <div className="product-detail-categories">
              {product.categories.map((cat) => (
                <span key={cat.id} className="product-detail-category">
                  {cat.name}
                </span>
              ))}
            </div>
          )}

          <h1 className="product-detail-title">{product.title}</h1>

          {product.shortDescription && (
            <p className="product-detail-short-desc">
              {product.shortDescription}
            </p>
          )}

          <div className="product-detail-price-section">
            <p className="product-detail-price">
              {displayPrice
                ? formatPrice(displayPrice.amount, displayPrice.currency)
                : formatPrices(product.prices)}
            </p>
            {Object.keys(product.prices).length > 1 && (
              <p className="product-detail-price-secondary">
                {formatPrices(product.prices)}
              </p>
            )}
          </div>

          {isPhysical && hasVariants && (
            <div className="product-detail-variants">
              <label
                htmlFor="variant-select"
                className="product-detail-variant-label"
              >
                {t`Varianta`}
              </label>
              <select
                id="variant-select"
                value={selectedVariantId || ""}
                onChange={(e) =>
                  setSelectedVariantId(e.target.value || null)
                }
                className="product-detail-variant-select"
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
                <p className="product-detail-sold-out">
                  {t`Tato varianta je momentálně vyprodána.`}
                </p>
              )}
            </div>
          )}

          <Link
            href="/pokladna"
            className="btn-style4 w-full justify-center text-center"
          >
            {t`Koupit`}
          </Link>

          {product.description && (
            <div className="product-detail-description">
              <h2 className="product-detail-description-title">{t`Popis`}</h2>
              <div className="page-content product-detail-description-content">
                {(() => {
                  try {
                    const parsed = JSON.parse(product.description);
                    if (parsed?.root) {
                      return renderLexicalContent(parsed);
                    }
                  } catch {
                    // Not JSON — render as plain text
                  }
                  return <p className="whitespace-pre-wrap">{product.description}</p>;
                })()}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
