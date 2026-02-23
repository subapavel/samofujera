"use client";

import { t } from "@lingui/core/macro";
import { FileIcon, Trash2 } from "lucide-react";
import type { MediaItemResponse } from "@samofujera/api-client";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Checkbox,
  Button,
  Badge,
} from "@samofujera/ui";
import { formatFileSize } from "./format-file-size";

interface MediaTableViewProps {
  items: MediaItemResponse[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onItemClick: (item: MediaItemResponse) => void;
  onDeleteItem: (item: MediaItemResponse) => void;
}

export function MediaTableView({
  items,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onItemClick,
  onDeleteItem,
}: MediaTableViewProps) {
  if (items.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        {t`Zatim zadne soubory.`}
      </p>
    );
  }

  const allSelected = items.length > 0 && items.every((i) => selectedIds.has(i.id));

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <Checkbox
                checked={allSelected}
                onCheckedChange={onToggleSelectAll}
                aria-label={t`Vybrat vse`}
              />
            </TableHead>
            <TableHead className="w-12" />
            <TableHead>{t`Nazev souboru`}</TableHead>
            <TableHead>{t`Typ`}</TableHead>
            <TableHead>{t`Velikost`}</TableHead>
            <TableHead>{t`Datum`}</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const isImage = item.mimeType.startsWith("image/");

            return (
              <TableRow
                key={item.id}
                className="cursor-pointer"
                onClick={() => onItemClick(item)}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedIds.has(item.id)}
                    onCheckedChange={() => onToggleSelect(item.id)}
                    aria-label={t`Vybrat ${item.originalFilename}`}
                  />
                </TableCell>
                <TableCell>
                  {isImage ? (
                    <img
                      src={item.thumbUrl ?? item.originalUrl}
                      alt={item.altText ?? item.originalFilename}
                      className="h-8 w-8 rounded object-cover"
                    />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded bg-muted text-muted-foreground">
                      <FileIcon className="h-4 w-4" />
                    </div>
                  )}
                </TableCell>
                <TableCell className="font-medium">
                  {item.originalFilename}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="text-[10px]">
                    {item.mimeType.split("/")[1]?.toUpperCase() ?? item.mimeType}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatFileSize(item.fileSizeBytes)}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(item.createdAt).toLocaleDateString("cs-CZ")}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => onDeleteItem(item)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
