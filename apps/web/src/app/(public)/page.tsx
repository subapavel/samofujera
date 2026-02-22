import type { Metadata } from "next";
import { notFound } from "next/navigation";
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
    title: page.metaTitle || `${page.title} | Samo Fujera`,
    description: page.metaDescription || undefined,
  };
}

export default async function HomePage() {
  const page = await getPage("home");
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
