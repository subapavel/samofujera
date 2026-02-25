"use client";

import { useQuery } from "@tanstack/react-query";
import { t } from "@lingui/core/macro";
import { Package } from "lucide-react";
import { adminApi } from "@samofujera/api-client";
import { ProductDetail } from "@/components/catalog/ProductDetail";
import type { ProductBlock } from "../types";

interface ProductBlockEditorProps {
  block: ProductBlock;
}

export function ProductBlockEditor({ block }: ProductBlockEditorProps) {
  const productQuery = useQuery({
    queryKey: ["admin", "products", block.productId],
    queryFn: () => adminApi.getProduct(block.productId),
  });

  const product = productQuery.data?.data;

  if (productQuery.isLoading) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-dashed border-[var(--border)] bg-[var(--muted)]/30 p-8">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--muted-foreground)] border-t-transparent" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--border)] bg-[var(--muted)]/30 p-8 text-sm text-[var(--muted-foreground)]">
        <Package className="h-4 w-4" />
        {t`Produkt nebyl nalezen`}
      </div>
    );
  }

  return <ProductDetail product={product} />;
}
