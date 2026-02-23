"use client";

import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { mediaApi } from "@samofujera/api-client";
import type { MediaItemResponse } from "@samofujera/api-client";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
} from "@samofujera/ui";
import { MediaGrid } from "./MediaGrid";
import { UploadProgress } from "./UploadProgress";
import { useMultiUpload } from "./useMultiUpload";

interface MediaPickerProps {
  value: string | null;
  onChange: (id: string | null) => void;
  accept?: string;
}

export function MediaPicker({ value, onChange, accept }: MediaPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState<MediaItemResponse | null>(
    null,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentItemQuery = useQuery({
    queryKey: ["media", "item", value],
    queryFn: () => mediaApi.getItem(value!),
    enabled: Boolean(value),
  });

  const itemsQuery = useQuery({
    queryKey: ["media", "items", { search, accept }],
    queryFn: () =>
      mediaApi.getItems({
        search: search || undefined,
        type: accept?.startsWith("image/") ? "IMAGE" : undefined,
        limit: 50,
      }),
    enabled: open,
  });

  const multiUpload = useMultiUpload();

  function handleUpload() {
    const files = fileInputRef.current?.files;
    if (files && files.length > 0) {
      multiUpload.addFiles(files);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleSelect(item: MediaItemResponse) {
    setSelectedItem(item);
  }

  function handleConfirmSelect() {
    if (selectedItem) {
      onChange(selectedItem.id);
      setOpen(false);
      setSelectedItem(null);
    }
  }

  function handleRemove() {
    onChange(null);
  }

  const currentItem = currentItemQuery.data?.data;
  const isImage = currentItem?.mimeType.startsWith("image/");
  const previewUrl = currentItem
    ? currentItem.originalUrl
    : undefined;

  return (
    <div>
      {value && currentItem ? (
        <div className="flex items-center gap-3">
          {isImage && previewUrl ? (
            <img
              src={previewUrl}
              alt={currentItem.altText ?? currentItem.originalFilename}
              className="h-16 w-16 rounded-md border border-[var(--border)] object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--muted)] text-xs text-[var(--muted-foreground)]">
              {currentItem.originalFilename.split(".").pop()?.toUpperCase()}
            </div>
          )}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(true)}
            >
              Zmenit
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleRemove}
            >
              Odebrat
            </Button>
          </div>
        </div>
      ) : (
        <Button type="button" variant="outline" onClick={() => setOpen(true)}>
          Vybrat obrazek
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Vybrat soubor</DialogTitle>
          </DialogHeader>

          {/* Search */}
          <div>
            <Input
              placeholder="Hledat podle nazvu..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Grid area */}
          <div className="min-h-[300px]">
            {itemsQuery.isLoading && (
              <p className="py-8 text-center text-sm text-[var(--muted-foreground)]">
                Načítání...
              </p>
            )}

            {itemsQuery.isSuccess && (
              <MediaGrid
                items={itemsQuery.data.data.items}
                selectedId={selectedItem?.id}
                onSelect={handleSelect}
              />
            )}
          </div>

          {multiUpload.uploads.length > 0 && (
            <div className="border-t border-[var(--border)] pt-3">
              <UploadProgress
                uploads={multiUpload.uploads}
                onCancel={multiUpload.cancelUpload}
                onClearDone={multiUpload.clearDone}
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between border-t border-[var(--border)] pt-4">
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept={accept}
                multiple
                className="hidden"
                onChange={handleUpload}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={multiUpload.isUploading}
              >
                {multiUpload.isUploading ? "Nahravam..." : "Nahrat soubory"}
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setOpen(false)}
              >
                Zrusit
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleConfirmSelect}
                disabled={!selectedItem}
              >
                Vybrat
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
