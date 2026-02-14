import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useParams } from "@tanstack/react-router";
import { catalogApi, checkoutApi } from "@samofujera/api-client";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@samofujera/ui";
import { formatPrice, productTypeLabel, formatFileSize } from "./utils";

export function ProductDetailPage() {
  const { slug } = useParams({ strict: false });
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["product", slug],
    queryFn: () => catalogApi.getProduct(slug as string),
    enabled: !!slug,
  });

  const checkoutMutation = useMutation({
    mutationFn: () =>
      checkoutApi.createCheckout({
        items: [{ productId: product!.id, quantity: 1 }],
      }),
    onSuccess: (response) => {
      window.location.href = response.data.checkoutUrl;
    },
    onError: () => {
      setCheckoutError("Nepodarilo se vytvorit objednavku. Zkuste to prosim znovu.");
    },
  });

  const product = data?.data;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-[var(--muted)]" />
        <div className="h-64 animate-pulse rounded-lg bg-[var(--muted)]" />
        <div className="h-32 animate-pulse rounded-lg bg-[var(--muted)]" />
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-12 text-center">
        <p className="text-lg text-[var(--muted-foreground)]">
          Produkt nebyl nalezen.
        </p>
        <Link to="/" className="mt-4 inline-block">
          <Button variant="outline">Zpet do katalogu</Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Back link */}
      <div className="mb-6">
        <Link
          to="/"
          className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
        >
          &larr; Zpet do katalogu
        </Link>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Thumbnail */}
          {product.thumbnailUrl && (
            <div className="aspect-video w-full overflow-hidden rounded-lg bg-[var(--muted)]">
              <img
                src={product.thumbnailUrl}
                alt={product.title}
                className="h-full w-full object-cover"
              />
            </div>
          )}

          {/* Title and metadata */}
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="inline-block rounded-full bg-[var(--secondary)] px-3 py-1 text-xs font-medium text-[var(--secondary-foreground)]">
                {productTypeLabel(product.productType)}
              </span>
              {product.categoryName && (
                <span className="inline-block rounded-full border border-[var(--border)] px-3 py-1 text-xs text-[var(--muted-foreground)]">
                  {product.categoryName}
                </span>
              )}
            </div>
            <h1 className="text-3xl font-bold">{product.title}</h1>
          </div>

          {/* Description */}
          {product.description && (
            <div className="prose max-w-none">
              <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
                <p className="whitespace-pre-wrap text-[var(--foreground)]">
                  {product.description}
                </p>
              </div>
            </div>
          )}

          {/* Assets */}
          {product.assets && product.assets.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Obsah produktu</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="divide-y divide-[var(--border)]">
                  {product.assets.map((asset) => (
                    <li key={asset.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                      <div className="flex items-center gap-3">
                        <span className="text-[var(--muted-foreground)]">
                          {assetTypeIcon(asset.assetType)}
                        </span>
                        <div>
                          <p className="text-sm font-medium">{asset.fileName}</p>
                          <p className="text-xs text-[var(--muted-foreground)]">
                            {asset.mimeType} &middot; {formatFileSize(asset.fileSizeBytes)}
                            {asset.durationSeconds != null && (
                              <> &middot; {formatDuration(asset.durationSeconds)}</>
                            )}
                          </p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar - purchase card */}
        <div className="lg:col-span-1">
          <div className="sticky top-8">
            <Card>
              <CardContent className="p-6 space-y-4">
                <p className="text-3xl font-bold text-[var(--primary)]">
                  {formatPrice(product.priceAmount, product.priceCurrency)}
                </p>
                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => checkoutMutation.mutate()}
                  disabled={checkoutMutation.isPending}
                >
                  {checkoutMutation.isPending ? "Zpracovavam..." : "Koupit"}
                </Button>
                {checkoutError && (
                  <p className="text-sm text-[var(--destructive)]">{checkoutError}</p>
                )}
                <p className="text-xs text-center text-[var(--muted-foreground)]">
                  Budete presmerovani na bezpecnou platebni branu Stripe
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function assetTypeIcon(type: string): string {
  switch (type) {
    case "FILE":
      return "\u{1F4C4}";
    case "VIDEO":
      return "\u{1F3AC}";
    case "AUDIO":
      return "\u{1F3B5}";
    default:
      return "\u{1F4CE}";
  }
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${minutes}:${String(secs).padStart(2, "0")}`;
}
