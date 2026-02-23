import { Suspense } from "react";
import { notFound } from "next/navigation";
import { catalogApi } from "@samofujera/api-client";
import { LeadCaptureForm } from "@/components/public/lead-capture-form";
import { Providers } from "@/components/dashboard/Providers";

export default async function LeadMagnetPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let product;
  try {
    const response = await catalogApi.getProduct(slug);
    product = response.data;
  } catch {
    notFound();
  }

  if (!product) {
    notFound();
  }

  // Only allow UNLISTED products or free ACTIVE products
  const isFree =
    !product.prices ||
    Object.keys(product.prices).length === 0 ||
    Object.values(product.prices).every((p) => p === 0);

  if (product.status !== "UNLISTED" && !(product.status === "ACTIVE" && isFree)) {
    notFound();
  }

  return (
    <div className="max-w-2xl mx-auto py-8 space-y-8">
      {product.thumbnailUrl && (
        <div className="flex justify-center">
          <img
            src={product.thumbnailUrl}
            alt={product.title}
            className="rounded-lg max-h-64 object-cover"
          />
        </div>
      )}

      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">{product.title}</h1>
        {product.shortDescription && (
          <p className="text-lg text-muted-foreground">
            {product.shortDescription}
          </p>
        )}
      </div>

      {product.description && (
        <div
          className="prose prose-neutral dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: product.description }}
        />
      )}

      <Suspense>
        <LeadCaptureForm slug={slug} productTitle={product.title} />
      </Suspense>
    </div>
  );
}
