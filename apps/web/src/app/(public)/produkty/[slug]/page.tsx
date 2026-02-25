import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ProductDetailView } from "@/components/catalog/ProductDetailView";
import { ProductPagePreview } from "@/components/page-renderer/ProductPagePreview";
import { PageRenderer } from "@/components/page-renderer/PageRenderer";

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const sp = await searchParams;
  const preview = sp.preview === "true";

  // No metadata for preview — the product might not be published yet
  if (preview) return { robots: { index: false, follow: false } };

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
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const preview = sp.preview === "true";

  // Preview: client-side fetch with credentials (browser has the SESSION cookie)
  if (preview) {
    return (
      <div
        className="bg-repeat pb-12 sm:pb-16"
        style={{ backgroundImage: "url('/images/bg-body-texture.png')" }}
      >
        <ProductPagePreview slug={slug} />
      </div>
    );
  }

  // Fetch product data (only returns ACTIVE products)
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
    // Fall through
  }

  // Product not found or not published → 404
  if (!product) {
    notFound();
  }

  // Try to fetch the page via the product page endpoint
  let pageContent = null;
  try {
    const res = await fetch(`${apiUrl}/api/pages/product/${slug}`, {
      cache: "no-store",
    });
    if (res.ok) {
      const json = await res.json();
      pageContent = json.data?.content;
    }
  } catch {
    // Fall through to standalone view
  }

  // If page exists with content, render via PageRenderer
  if (pageContent) {
    const productData = { [product.id]: product };
    return (
      <div
        className="bg-repeat pb-12 sm:pb-16"
        style={{ backgroundImage: "url('/images/bg-body-texture.png')" }}
      >
        <PageRenderer content={pageContent} productData={productData} />
      </div>
    );
  }

  // Fallback: standalone product detail view
  return (
    <div
      className="bg-repeat pb-12 sm:pb-16"
      style={{ backgroundImage: "url('/images/bg-body-texture.png')" }}
    >
      <ProductDetailView product={product} />
    </div>
  );
}
