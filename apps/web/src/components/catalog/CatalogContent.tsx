"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { catalogApi } from "@samofujera/api-client";
import { formatPrices, productTypeLabel } from "./utils";

export function CatalogContent() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["catalog", "products"],
    queryFn: () => catalogApi.getProducts(),
  });

  const products = data?.data.items ?? [];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1
        className="text-3xl font-medium text-center mb-10"
        style={{ fontFamily: "'Playfair Display', serif" }}
      >
        Obchod
      </h1>

      {isLoading && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 animate-pulse rounded-lg bg-[var(--muted)]" />
          ))}
        </div>
      )}

      {isError && (
        <p className="text-center text-[var(--destructive)]">
          Nepodařilo se načíst produkty. Zkuste to prosím znovu.
        </p>
      )}

      {!isLoading && !isError && products.length === 0 && (
        <p className="text-center text-[var(--muted-foreground)]">
          Zatím zde nejsou žádné produkty.
        </p>
      )}

      {products.length > 0 && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <Link
              key={product.id}
              href={"/katalog/" + product.slug}
              className="group block rounded-lg border border-[var(--border)] bg-[var(--card)] overflow-hidden hover:shadow-md transition-shadow"
            >
              {product.thumbnailUrl ? (
                <img
                  src={product.thumbnailUrl}
                  alt={product.title}
                  className="w-full h-48 object-cover"
                />
              ) : (
                <div className="w-full h-48 bg-[var(--muted)] flex items-center justify-center">
                  <span className="text-4xl text-[var(--muted-foreground)] opacity-30">
                    ♦
                  </span>
                </div>
              )}
              <div className="p-4">
                <p className="text-xs text-[var(--muted-foreground)] uppercase tracking-wider mb-1">
                  {productTypeLabel(product.productType)}
                </p>
                <h2 className="text-lg font-medium text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors">
                  {product.title}
                </h2>
                {product.shortDescription && (
                  <p className="mt-1 text-sm text-[var(--muted-foreground)] line-clamp-2">
                    {product.shortDescription}
                  </p>
                )}
                <p className="mt-3 text-lg font-semibold text-[var(--primary)]">
                  {formatPrices(product.prices)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
