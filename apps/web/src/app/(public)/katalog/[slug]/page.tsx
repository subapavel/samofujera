import type { Metadata } from "next";
import { ProductDetail } from "@/components/catalog/ProductDetail";
import { Providers } from "@/components/dashboard/Providers";

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

    const title = `${data.title} | Samo Fujera`;
    const description = data.shortDescription || data.description || undefined;

    return {
      title,
      description,
      openGraph: {
        title: data.title,
        description,
        images: [
          {
            url: `/api/og-image/product/${slug}`,
            width: 1200,
            height: 630,
          },
        ],
      },
    };
  } catch {
    return {};
  }
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <Providers>
      <ProductDetail slug={slug} />
    </Providers>
  );
}
