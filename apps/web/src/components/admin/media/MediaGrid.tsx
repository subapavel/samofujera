"use client";

import { t } from "@lingui/core/macro";
import type { MediaItemResponse } from "@samofujera/api-client";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface MediaGridProps {
  items: MediaItemResponse[];
  selectedId?: string;
  onSelect: (item: MediaItemResponse) => void;
}

export function MediaGrid({ items, selectedId, onSelect }: MediaGridProps) {
  if (items.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-[var(--muted-foreground)]">
        {t`Zatím žádné soubory.`}
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {items.map((item) => {
        const isImage = item.mimeType.startsWith("image/");
        const isSelected = item.id === selectedId;

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item)}
            className={`rounded-md border p-2 text-left transition-colors hover:bg-[var(--accent)] ${
              isSelected
                ? "border-[var(--ring)] ring-2 ring-[var(--ring)]"
                : "border-[var(--border)]"
            }`}
          >
            {isImage ? (
              <img
                src={item.originalUrl}
                alt={item.altText ?? item.originalFilename}
                className="aspect-square w-full rounded object-cover"
              />
            ) : (
              <div className="flex aspect-square w-full items-center justify-center rounded bg-[var(--muted)] text-[var(--muted-foreground)]">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
                  <path d="M14 2v4a2 2 0 0 0 2 2h4" />
                </svg>
              </div>
            )}
            <p className="mt-1.5 truncate text-xs font-medium">
              {item.originalFilename}
            </p>
            <p className="text-xs text-[var(--muted-foreground)]">
              {formatFileSize(item.fileSizeBytes)}
            </p>
          </button>
        );
      })}
    </div>
  );
}
