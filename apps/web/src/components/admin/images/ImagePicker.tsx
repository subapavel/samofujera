"use client";

import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { t } from "@lingui/core/macro";
import { imageApi } from "@samofujera/api-client";
import type { ImageDetailResponse } from "@samofujera/api-client";
import { Check } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Input,
  Slider,
} from "@samofujera/ui";
import { UploadProgress } from "./UploadProgress";
import { useMultiUpload } from "./useMultiUpload";
import { formatFileSize } from "./format-file-size";

export interface ImagePickerResult {
  imageId: string;
  panX: number;
  panY: number;
}

interface ImagePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (result: ImagePickerResult) => void;
  onSelectMultiple?: (results: ImagePickerResult[]) => void;
  multiple?: boolean;
  targetAspectRatio?: number;
}

type PickerStep = "select" | "pan";

export function ImagePicker({
  open,
  onOpenChange,
  onSelect,
  onSelectMultiple,
  multiple = false,
  targetAspectRatio,
}: ImagePickerProps) {
  const [search, setSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState<ImageDetailResponse | null>(null);
  const [selectedItems, setSelectedItems] = useState<ImageDetailResponse[]>([]);
  const [step, setStep] = useState<PickerStep>("select");
  const [panX, setPanX] = useState(50);
  const [panY, setPanY] = useState(50);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const multiUpload = useMultiUpload({
    onAllDone: () => {
      // Refetch after uploads complete
    },
  });

  const imagesQuery = useQuery({
    queryKey: ["images", "picker", search],
    queryFn: () =>
      imageApi.getImages({
        search: search || undefined,
        limit: 50,
      }),
    enabled: open,
  });

  const items = imagesQuery.data?.data?.items ?? [];

  function handleUpload() {
    const files = fileInputRef.current?.files;
    if (files && files.length > 0) {
      multiUpload.addFiles(files);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleSelectImage(item: ImageDetailResponse) {
    if (multiple) {
      setSelectedItems((prev) => {
        const exists = prev.some((i) => i.id === item.id);
        if (exists) {
          return prev.filter((i) => i.id !== item.id);
        }
        return [...prev, item];
      });
    } else {
      setSelectedItem(item);
    }
  }

  function handleConfirmSelect() {
    if (multiple) {
      if (selectedItems.length === 0) return;
      const results = selectedItems.map((item) => ({
        imageId: item.id,
        panX: 50,
        panY: 50,
      }));
      onSelectMultiple?.(results);
      handleReset();
      return;
    }

    if (!selectedItem) return;

    // Check if we need the pan step
    if (targetAspectRatio != null && selectedItem.width != null && selectedItem.height != null) {
      const imageAr = selectedItem.width / selectedItem.height;
      const diff = Math.abs(imageAr - targetAspectRatio) / targetAspectRatio;
      if (diff > 0.1) {
        // Aspect ratios differ by >10%, show pan step
        setPanX(50);
        setPanY(50);
        setStep("pan");
        return;
      }
    }

    // No pan needed, select directly
    onSelect({ imageId: selectedItem.id, panX: 50, panY: 50 });
    handleReset();
  }

  function handleConfirmPan() {
    if (!selectedItem) return;
    onSelect({ imageId: selectedItem.id, panX, panY });
    handleReset();
  }

  function handleBackToSelect() {
    setStep("select");
  }

  function handleReset() {
    setSelectedItem(null);
    setSelectedItems([]);
    setSearch("");
    setStep("select");
    setPanX(50);
    setPanY(50);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      handleReset();
    }
    onOpenChange(nextOpen);
  }

  // Determine if we need horizontal or vertical pan slider
  const needsHPan =
    selectedItem != null &&
    targetAspectRatio != null &&
    selectedItem.width != null &&
    selectedItem.height != null &&
    selectedItem.width / selectedItem.height > targetAspectRatio;

  const needsVPan =
    selectedItem != null &&
    targetAspectRatio != null &&
    selectedItem.width != null &&
    selectedItem.height != null &&
    selectedItem.width / selectedItem.height < targetAspectRatio;

  const hasSelection = multiple ? selectedItems.length > 0 : selectedItem != null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl">
        {step === "select" ? (
          <>
            <DialogHeader>
              <DialogTitle>
                {multiple ? t`Vybrat obrázky` : t`Vybrat obrázek`}
              </DialogTitle>
              <DialogDescription>
                {multiple
                  ? t`Vyberte obrázky z knihovny nebo nahrajte nové.`
                  : t`Vyberte obrázek z knihovny nebo nahrajte nový.`}
              </DialogDescription>
            </DialogHeader>

            {/* Search */}
            <div>
              <Input
                placeholder={t`Hledat podle názvu...`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Grid */}
            <div className="min-h-[300px] max-h-[50vh] overflow-y-auto">
              {imagesQuery.isLoading && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  {t`Načítání...`}
                </p>
              )}

              {imagesQuery.isSuccess && items.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  {t`Žádné obrázky nenalezeny.`}
                </p>
              )}

              {imagesQuery.isSuccess && items.length > 0 && (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {items.map((item) => {
                    const isSelected = multiple
                      ? selectedItems.some((i) => i.id === item.id)
                      : item.id === selectedItem?.id;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelectImage(item)}
                        className={`relative rounded-md border p-2 text-left transition-colors hover:bg-accent ${
                          isSelected
                            ? "border-primary ring-2 ring-primary"
                            : "border-[var(--border)]"
                        }`}
                      >
                        {multiple && isSelected && (
                          <div className="absolute right-3 top-3 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                            <Check className="h-3 w-3" />
                          </div>
                        )}
                        <div className="aspect-square w-full overflow-hidden rounded bg-muted">
                          <img
                            src={item.url}
                            alt={item.altText ?? item.originalFilename}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <p className="mt-1.5 truncate text-xs font-medium">
                          {item.title ?? item.originalFilename}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(item.fileSizeBytes)}
                        </p>
                      </button>
                    );
                  })}
                </div>
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
                  accept="image/*"
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
                  {multiUpload.isUploading ? t`Nahrávám...` : t`Nahrát obrázky`}
                </Button>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenChange(false)}
                >
                  {t`Zrušit`}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleConfirmSelect}
                  disabled={!hasSelection}
                >
                  {multiple && selectedItems.length > 0
                    ? t`Vybrat (${selectedItems.length})`
                    : t`Vybrat`}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{t`Upravit pozici`}</DialogTitle>
              <DialogDescription>
                {t`Nastavte, která část obrázku bude viditelná v cílovém formátu.`}
              </DialogDescription>
            </DialogHeader>

            {/* Pan preview */}
            {selectedItem && (
              <div className="space-y-4">
                <div
                  className="mx-auto overflow-hidden rounded-md border bg-muted"
                  style={{
                    width: "100%",
                    maxWidth: "400px",
                    aspectRatio: targetAspectRatio ? String(targetAspectRatio) : "1",
                  }}
                >
                  <img
                    src={selectedItem.url}
                    alt={selectedItem.altText ?? selectedItem.originalFilename}
                    className="h-full w-full object-cover"
                    style={{
                      objectPosition: `${panX}% ${panY}%`,
                    }}
                  />
                </div>

                {needsHPan && (
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">
                      {t`Vodorovná pozice`}
                    </label>
                    <Slider
                      min={0}
                      max={100}
                      step={1}
                      value={[panX]}
                      onValueChange={(value) => setPanX(value[0])}
                    />
                  </div>
                )}

                {needsVPan && (
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">
                      {t`Svislá pozice`}
                    </label>
                    <Slider
                      min={0}
                      max={100}
                      step={1}
                      value={[panY]}
                      onValueChange={(value) => setPanY(value[0])}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between border-t border-[var(--border)] pt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleBackToSelect}
              >
                {t`Zpět`}
              </Button>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenChange(false)}
                >
                  {t`Zrušit`}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleConfirmPan}
                >
                  {t`Potvrdit`}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
