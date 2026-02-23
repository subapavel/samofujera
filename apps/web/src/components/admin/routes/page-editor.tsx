"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { t } from "@lingui/core/macro";

export function PageEditorPage() {
  const params = useParams();
  const router = useRouter();
  const pageId = params?.pageId as string;

  useEffect(() => {
    if (pageId) {
      router.replace(`/admin/stranky/${pageId}/edit`);
    }
  }, [pageId, router]);

  return (
    <div className="flex h-full items-center justify-center">
      <p className="text-[var(--muted-foreground)]">{t`Přesměrování...`}</p>
    </div>
  );
}
