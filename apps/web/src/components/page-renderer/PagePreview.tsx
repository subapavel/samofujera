"use client";

import { useEffect, useState } from "react";
import { pagePublicApi } from "@samofujera/api-client";
import { PageRenderer } from "./PageRenderer";

interface PagePreviewProps {
  slug: string;
}

export function PagePreview({ slug }: PagePreviewProps) {
  const [content, setContent] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetchPreview() {
      try {
        const res = await pagePublicApi.getPagePreview(slug);
        if (!cancelled) {
          setContent(res.data.content);
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void fetchPreview();
    return () => { cancelled = true; };
  }, [slug]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-sm text-[var(--muted-foreground)]">Načítání náhledu...</p>
      </div>
    );
  }

  if (error || !content) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-sm text-[var(--destructive)]">
          Náhled není dostupný. Ujistěte se, že jste přihlášeni jako admin.
        </p>
      </div>
    );
  }

  return <PageRenderer content={content} />;
}
