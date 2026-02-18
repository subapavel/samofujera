import { ProductDetail } from "@/components/catalog/ProductDetail";
import { Providers } from "@/components/dashboard/Providers";

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
