"use client";

import { t } from "@lingui/core/macro";
import { FileIcon } from "lucide-react";
import type { MediaItemResponse } from "@samofujera/api-client";
import { Card, CardContent, Badge, Checkbox } from "@samofujera/ui";
import { formatFileSize } from "./format-file-size";

interface MediaGridViewProps {
  items: MediaItemResponse[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onItemClick: (item: MediaItemResponse) => void;
}

export function MediaGridView({
  items,
  selectedIds,
  onToggleSelect,
  onItemClick,
}: MediaGridViewProps) {
  if (items.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        {t`Zatim zadne soubory.`}
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {items.map((item) => {
        const isImage = item.mimeType.startsWith("image/");
        const isSelected = selectedIds.has(item.id);

        return (
          <Card
            key={item.id}
            className={`group relative cursor-pointer transition-colors hover:bg-accent/50 ${
              isSelected ? "ring-2 ring-ring" : ""
            }`}
          >
            <div
              className={`absolute top-2 left-2 z-10 transition-opacity ${
                isSelected
                  ? "opacity-100"
                  : "opacity-0 group-hover:opacity-100"
              }`}
            >
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => onToggleSelect(item.id)}
                aria-label={t`Vybrat ${item.originalFilename}`}
                className="bg-background"
              />
            </div>
            <CardContent
              className="p-2"
              onClick={() => onItemClick(item)}
            >
              {isImage ? (
                <img
                  src={item.thumbUrl ?? item.originalUrl}
                  alt={item.altText ?? item.originalFilename}
                  className="aspect-square w-full rounded-md object-cover"
                />
              ) : (
                <div className="flex aspect-square w-full items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <FileIcon className="h-10 w-10" />
                </div>
              )}
              <div className="mt-2 space-y-1">
                <p className="truncate text-sm font-medium">
                  {item.originalFilename}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {formatFileSize(item.fileSizeBytes)}
                  </span>
                  <Badge variant="secondary" className="text-[10px]">
                    {item.mimeType.split("/")[1]?.toUpperCase() ?? item.mimeType}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
