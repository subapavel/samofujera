"use client";

import Link from "next/link";
import { t } from "@lingui/core/macro";
import type { ProductDetailResponse } from "@samofujera/api-client";
import { ProductDetail } from "./ProductDetail";

interface ProductDetailViewProps {
  product: ProductDetailResponse | null;
}

export function ProductDetailView({ product }: ProductDetailViewProps) {
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

  return <ProductDetail product={product} />;
}
