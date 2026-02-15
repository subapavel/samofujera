import { Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@samofujera/ui";
import type { ProductResponse } from "@samofujera/api-client";
import { formatPrices, productTypeLabel } from "./utils";

interface ProductCardProps {
  product: ProductResponse;
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <Link to="/$slug" params={{ slug: product.slug }} className="block group">
      <Card className="h-full transition-shadow hover:shadow-md">
        <div className="aspect-video w-full overflow-hidden rounded-t-lg bg-[var(--muted)]">
          {product.thumbnailUrl ? (
            <img
              src={product.thumbnailUrl}
              alt={product.title}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <span className="text-3xl text-[var(--muted-foreground)]">
                {productTypeIcon(product.productType)}
              </span>
            </div>
          )}
        </div>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <span className="inline-block rounded-full bg-[var(--secondary)] px-2 py-0.5 text-xs font-medium text-[var(--secondary-foreground)]">
              {productTypeLabel(product.productType)}
            </span>
            {product.categories?.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {product.categories.map((cat) => (
                  <span key={cat.id} className="inline-block rounded-full bg-[var(--accent)] px-2 py-0.5 text-xs text-[var(--accent-foreground)]">
                    {cat.name}
                  </span>
                ))}
              </div>
            )}
          </div>
          <CardTitle className="line-clamp-2 text-base">{product.title}</CardTitle>
        </CardHeader>
        <CardContent>
          {product.shortDescription && (
            <p className="mb-3 line-clamp-2 text-sm text-[var(--muted-foreground)]">
              {product.shortDescription}
            </p>
          )}
          <p className="text-lg font-bold text-[var(--primary)]">
            {formatPrices(product.prices)}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}

function productTypeIcon(type: string): string {
  switch (type) {
    case "EBOOK":
      return "\u{1F4E5}";
    case "AUDIO_VIDEO":
      return "\u{25B6}\u{FE0F}";
    case "PHYSICAL":
      return "\u{1F4E6}";
    case "ONLINE_EVENT":
    case "RECURRING_EVENT":
    case "OFFLINE_EVENT":
      return "\u{1F3AB}";
    default:
      return "\u{1F4C4}";
  }
}
