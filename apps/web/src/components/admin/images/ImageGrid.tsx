"use client";

import { t } from "@lingui/core/macro";
import type { ImageDetailResponse } from "@samofujera/api-client";
import { formatFileSize } from "./format-file-size";

interface ImageGridProps {
  items: ImageDetailResponse[];
  selectedId?: string;
  onSelect: (item: ImageDetailResponse) => void;
}

export function ImageGrid({ items, selectedId, onSelect }: ImageGridProps) {
  if (items.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-[var(--muted-foreground)]">
        {t`Žádné obrázky nenalezeny.`}
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {items.map((item) => {
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
            <div className="aspect-square w-full overflow-hidden rounded bg-[var(--muted)]">
              <img
                src={item.url}
                alt={item.altText ?? item.originalFilename}
                className="h-full w-full object-cover"
              />
            </div>
            <p className="mt-1.5 truncate text-xs font-medium">
              {item.title ?? item.originalFilename}
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
