"use client";

import { useEffect, useState } from "react";
import { pagePublicApi, catalogApi } from "@samofujera/api-client";
import type { ProductDetailResponse } from "@samofujera/api-client";
import { PageRenderer } from "./PageRenderer";
import { ProductDetail } from "@/components/catalog/ProductDetail";

interface ProductPagePreviewProps {
  slug: string;
}

export function ProductPagePreview({ slug }: ProductPagePreviewProps) {
  const [product, setProduct] = useState<ProductDetailResponse | null>(null);
  const [pageContent, setPageContent] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetchPreview() {
      try {
        // Fetch product via catalog API with preview flag (no status filter for admins)
        const productRes = await catalogApi.getProductPreview(slug);
        if (cancelled) return;
        const prod = productRes.data;
        setProduct(prod);

        // Try to fetch page preview (draft content, requires admin auth)
        try {
          const pageRes = await pagePublicApi.getProductPagePreview(slug);
          if (!cancelled && pageRes.data?.content) {
            setPageContent(pageRes.data.content);
          }
        } catch {
          // No page exists — will render standalone
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void fetchPreview();
    return () => { cancelled = true; };
  }, [slug]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-sm text-[var(--muted-foreground)]">Načítání náhledu...</p>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-sm text-[var(--destructive)]">
          Náhled není dostupný. Ujistěte se, že jste přihlášeni jako admin.
        </p>
      </div>
    );
  }

  // If page exists with content, render via PageRenderer
  if (pageContent) {
    const productData = { [product.id]: product };
    return <PageRenderer content={pageContent} productData={productData} />;
  }

  // Fallback: standalone product detail
  return <ProductDetail product={product} />;
}
