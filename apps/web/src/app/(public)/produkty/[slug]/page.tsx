import type { Metadata } from "next";
import { ProductDetailView } from "@/components/catalog/ProductDetailView";

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  try {
    const res = await fetch(`${apiUrl}/api/catalog/products/${slug}`, {
      cache: "no-store",
    });
    if (!res.ok) return {};
    const { data } = await res.json();

    const title = data.metaTitle || `${data.title} | Samo Fujera`;
    const description =
      data.metaDescription || data.shortDescription || data.description || undefined;

    return {
      title,
      description,
      openGraph: {
        title: data.metaTitle || data.title,
        description,
        images: data.thumbnailUrl
          ? [{ url: data.thumbnailUrl, width: 1200, height: 630 }]
          : [{ url: `/api/og-image/product/${slug}`, width: 1200, height: 630 }],
      },
    };
  } catch {
    return {};
  }
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let product = null;
  try {
    const res = await fetch(`${apiUrl}/api/catalog/products/${slug}`, {
      cache: "no-store",
    });
    if (res.ok) {
      const json = await res.json();
      product = json.data;
    }
  } catch {
    // Fall through to not-found state
  }

  return <ProductDetailView product={product} />;
}
