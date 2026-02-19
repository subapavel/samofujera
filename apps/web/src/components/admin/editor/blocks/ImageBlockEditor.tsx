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
import { MediaGrid } from "../../media/MediaGrid";
import { UploadProgress } from "../../media/UploadProgress";
import { useMultiUpload } from "../../media/useMultiUpload";
import type { ImageBlock, ImageAlignment } from "../types";

interface ImageBlockEditorProps {
  block: ImageBlock;
  onChange: (block: ImageBlock) => void;
}

export function ImageBlockEditor({ block, onChange }: ImageBlockEditorProps) {
  const [isSelected, setIsSelected] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState<MediaItemResponse | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const multiUpload = useMultiUpload({ isPublic: true });

  const itemsQuery = useQuery({
    queryKey: ["media", "items", { search, pickerOpen: showPicker }],
    queryFn: () => mediaApi.getItems({ search: search || undefined, limit: 50 }),
    enabled: showPicker,
  });

  const imageItems = (itemsQuery.data?.data?.items ?? []).filter((item) =>
    item.mimeType.startsWith("image/"),
  );

  const alignClasses: Record<ImageAlignment, string> = {
    left: "mr-auto",
    center: "mx-auto",
    right: "ml-auto",
    full: "w-full",
  };

  function handleAlignmentChange(newAlignment: ImageAlignment) {
    onChange({ ...block, alignment: newAlignment });
  }

  function handlePickerOpen() {
    setShowPicker(true);
    setSelectedItem(null);
    setSearch("");
  }

  function handleUpload() {
    const files = fileInputRef.current?.files;
    if (files && files.length > 0) {
      multiUpload.addFiles(files);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleConfirmSelect() {
    if (selectedItem) {
      onChange({
        ...block,
        src: selectedItem.largeUrl ?? selectedItem.originalUrl,
        altText: selectedItem.altText ?? selectedItem.originalFilename,
        mediaItemId: selectedItem.id,
      });
      setShowPicker(false);
      setSelectedItem(null);
    }
  }

  return (
    <>
      <div
        className="relative"
        onClick={() => setIsSelected(!isSelected)}
      >
        {block.src ? (
          <>
            <img
              src={block.src}
              alt={block.altText}
              className={`max-w-full rounded ${alignClasses[block.alignment]}`}
              style={{ display: "block" }}
            />
            {isSelected && (
              <div className="absolute -top-10 left-1/2 flex -translate-x-1/2 gap-1 rounded-lg border border-[var(--border)] bg-[var(--card)] p-1 shadow-lg">
                {(["left", "center", "right", "full"] as ImageAlignment[]).map((a) => (
                  <button
                    key={a}
                    className={`rounded px-2 py-1 text-xs ${block.alignment === a ? "bg-[rgb(6,93,77)] text-white" : "hover:bg-[var(--accent)]"}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAlignmentChange(a);
                    }}
                  >
                    {a}
                  </button>
                ))}
                <button
                  className="rounded px-2 py-1 text-xs hover:bg-[var(--accent)]"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePickerOpen();
                  }}
                >
                  Změnit
                </button>
              </div>
            )}
          </>
        ) : (
          <div
            className={`flex h-48 cursor-pointer items-center justify-center rounded border-2 border-dashed border-[var(--border)] bg-[var(--muted)] hover:border-[rgb(6,93,77)] hover:bg-[rgb(6,93,77)]/5 ${alignClasses[block.alignment]}`}
            onClick={(e) => {
              e.stopPropagation();
              handlePickerOpen();
            }}
          >
            <span className="text-[var(--muted-foreground)]">Klikni pro vložení obrázku</span>
          </div>
        )}
      </div>

      <Dialog open={showPicker} onOpenChange={setShowPicker}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Vybrat obrázek</DialogTitle>
          </DialogHeader>
          <div>
            <Input
              placeholder="Hledat podle názvu..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="min-h-[300px] max-h-[50vh] overflow-y-auto">
            {itemsQuery.isLoading && (
              <p className="py-8 text-center text-sm text-[var(--muted-foreground)]">Načítání...</p>
            )}
            {itemsQuery.isSuccess && (
              <MediaGrid items={imageItems} selectedId={selectedItem?.id} onSelect={setSelectedItem} />
            )}
          </div>
          {multiUpload.uploads.length > 0 && (
            <div className="border-t border-[var(--border)] pt-3">
              <UploadProgress uploads={multiUpload.uploads} onCancel={multiUpload.cancelUpload} onClearDone={multiUpload.clearDone} />
            </div>
          )}
          <div className="flex items-center justify-between border-t border-[var(--border)] pt-4">
            <div className="flex items-center gap-2">
              <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} />
              <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={multiUpload.isUploading}>
                {multiUpload.isUploading ? "Nahrávám..." : "Nahrát obrázky"}
              </Button>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowPicker(false)}>Zrušit</Button>
              <Button type="button" size="sm" onClick={handleConfirmSelect} disabled={!selectedItem}>Vybrat</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
