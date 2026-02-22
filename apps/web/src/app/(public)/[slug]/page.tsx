import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { PageRenderer } from "@/components/page-renderer/PageRenderer";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

async function getPage(slug: string, preview: boolean) {
  try {
    const headers: Record<string, string> = {};
    if (preview) {
      const cookieStore = await cookies();
      const session = cookieStore.get("SESSION");
      if (session) {
        headers["Cookie"] = `SESSION=${session.value}`;
      }
    }
    const url = preview
      ? `${API_URL}/api/pages/${slug}?preview=true`
      : `${API_URL}/api/pages/${slug}`;
    const res = await fetch(url, {
      cache: "no-store",
      headers,
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
  const page = await getPage(slug, preview);
  if (!page) return {};
  return {
    title: page.metaTitle || `${page.title} | Samo Fujera`,
    description: page.metaDescription || undefined,
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
  const page = await getPage(slug, preview);
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
