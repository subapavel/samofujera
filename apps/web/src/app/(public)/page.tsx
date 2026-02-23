import type { Metadata } from "next";
import Link from "next/link";
import { PageRenderer } from "@/components/page-renderer/PageRenderer";

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

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage("home");
  if (!page) {
    return {
      title: "Sámo Fujera – pohled na život, zdraví a souvislosti",
    };
  }
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

function PlaceholderHome() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="mb-4 text-3xl font-bold">Sámo Fujera</h1>
      <p className="mb-8 max-w-md text-lg text-[var(--muted-foreground)]">
        Stránka se připravuje. Brzy tu najdete obsah o zdraví, osobním rozvoji
        a duchovním růstu.
      </p>
      <Link
        href="/admin"
        className="rounded-md bg-[var(--primary)] px-6 py-3 text-sm font-medium text-white transition-colors hover:opacity-90"
      >
        Přejít do administrace
      </Link>
    </div>
  );
}

export default async function HomePage() {
  const page = await getPage("home");

  if (!page) {
    return <PlaceholderHome />;
  }

  return (
    <div
      className="bg-repeat pb-12 sm:pb-16"
      style={{ backgroundImage: "url('/images/bg-body-texture.png')" }}
    >
      {page.content && <PageRenderer content={page.content} />}
    </div>
  );
}
