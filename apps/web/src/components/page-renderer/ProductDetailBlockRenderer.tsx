"use client";

import type { ProductDetailResponse } from "@samofujera/api-client";
import { ProductDetail } from "@/components/catalog/ProductDetail";

interface ProductDetailBlockRendererProps {
  product: ProductDetailResponse;
}

export function ProductDetailBlockRenderer({ product }: ProductDetailBlockRendererProps) {
  return <ProductDetail product={product} />;
}
