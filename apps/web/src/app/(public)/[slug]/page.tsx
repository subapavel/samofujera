import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageRenderer } from "@/components/page-renderer/PageRenderer";
import { PagePreview } from "@/components/page-renderer/PagePreview";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

async function getPage(slug: string) {
  try {
    const res = await fetch(`${API_URL}/api/pages/${slug}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data;
  } catch {
    return null;
  }
}

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
  // No metadata for preview — the page might not be published yet
  if (preview) return { robots: { index: false, follow: false } };
  const page = await getPage(slug);
  if (!page) return {};
  return {
    title: page.metaTitle || `${page.title} | Sámo Fujera`,
    description: page.metaDescription || undefined,
    keywords: page.metaKeywords || undefined,
    openGraph: {
      title: page.ogTitle || page.metaTitle || page.title,
      description: page.ogDescription || page.metaDescription || undefined,
      images: page.ogImageUrl ? [{ url: page.ogImageUrl }] : undefined,
    },
    robots: {
      index: !page.noindex,
      follow: !page.nofollow,
    },
  };
}

export default async function CmsPageRoute({
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
        <PagePreview slug={slug} />
      </div>
    );
  }

  // Published page: server-side fetch (no auth needed, good for SEO)
  const page = await getPage(slug);
  if (!page) notFound();

  return (
    <div
      className="bg-repeat pb-12 sm:pb-16"
      style={{ backgroundImage: "url('/images/bg-body-texture.png')" }}
    >
      {page.content && <PageRenderer content={page.content} />}
    </div>
  );
}
