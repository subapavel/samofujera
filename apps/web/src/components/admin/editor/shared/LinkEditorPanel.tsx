"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { pageAdminApi } from "@samofujera/api-client";

interface LinkEditorPanelProps {
  initialUrl?: string;
  initialOpenInNewTab?: boolean;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: (url: string, openInNewTab: boolean) => void;
  onCancel: () => void;
}

export function LinkEditorPanel({
  initialUrl = "",
  initialOpenInNewTab = false,
  confirmLabel = "Použít",
  cancelLabel = "Zrušit",
  onConfirm,
  onCancel,
}: LinkEditorPanelProps) {
  const [url, setUrl] = useState(initialUrl);
  const [openInNewTab, setOpenInNewTab] = useState(initialOpenInNewTab);
  const [showPagePicker, setShowPagePicker] = useState(false);
  const params = useParams();
  const currentPageId = params?.pageId as string | undefined;

  const pagesQuery = useQuery({
    queryKey: ["admin", "pages", { limit: 100 }],
    queryFn: () => pageAdminApi.getPages({ limit: 100 }),
    enabled: showPagePicker,
  });

  function handleSelectPage(slug: string) {
    setUrl(`/${slug}`);
    setShowPagePicker(false);
  }

  return (
    <>
      {/* URL input with page picker chevron */}
      <div className="relative mb-3">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onConfirm(url, openInNewTab);
            }
          }}
          placeholder="např. www.google.cz"
          autoFocus
          className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2.5 pr-9 text-sm text-white placeholder-white/40 outline-none focus:border-white/40"
        />
        <button
          type="button"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 transition-colors hover:text-white/70"
          onClick={() => setShowPagePicker(!showPagePicker)}
          title="Vybrat stránku"
        >
          <ChevronDown className={`h-4 w-4 transition-transform ${showPagePicker ? "rotate-180" : ""}`} />
        </button>
      </div>

      {/* Page picker dropdown */}
      {showPagePicker && (
        <div className="mb-3 max-h-40 overflow-y-auto rounded-lg border border-gray-600 bg-gray-700">
          {pagesQuery.isLoading && (
            <p className="p-2 text-xs text-white/50">Načítání...</p>
          )}
          {pagesQuery.data?.data?.items
            ?.filter((page) => page.id !== currentPageId)
            .map((page) => (
              <button
                key={page.id}
                type="button"
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm text-white/80 transition-colors hover:bg-white/10"
                onClick={() => handleSelectPage(page.slug)}
              >
                <span className="truncate">{page.title}</span>
                <span className="shrink-0 text-xs text-white/50">/{page.slug}</span>
              </button>
            ))}
          {pagesQuery.data?.data?.items?.filter((p) => p.id !== currentPageId).length === 0 && !pagesQuery.isLoading && (
            <p className="p-2 text-xs text-white/50">Žádné stránky</p>
          )}
        </div>
      )}

      {/* Open in new tab checkbox */}
      <label className="mb-4 flex items-center gap-2 text-sm text-white/70">
        <input
          type="checkbox"
          checked={openInNewTab}
          onChange={(e) => setOpenInNewTab(e.target.checked)}
          className="h-4 w-4 rounded border-gray-600"
        />
        Otevřít v novém okně
      </label>

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          type="button"
          className="rounded-lg bg-sky-500 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-600 disabled:opacity-50"
          onClick={() => onConfirm(url, openInNewTab)}
          disabled={!url.trim()}
        >
          {confirmLabel}
        </button>
        <button
          type="button"
          className="rounded-lg border border-gray-600 bg-transparent px-6 py-2 text-sm text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          onClick={onCancel}
        >
          {cancelLabel}
        </button>
      </div>
    </>
  );
}
