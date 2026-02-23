"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { mediaApi } from "@samofujera/api-client";
import type { MediaItemResponse } from "@samofujera/api-client";
import { Button, Input, Label } from "@samofujera/ui";
import { MediaGrid } from "../media/MediaGrid";
import { UploadProgress } from "../media/UploadProgress";
import { useMultiUpload } from "../media/useMultiUpload";

const textareaClassName =
  "flex w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm ring-offset-[var(--background)] placeholder:text-[var(--muted-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2";

const SOURCES = [
  { label: "Vše", value: undefined },
  { label: "Produkty", value: "products" },
  { label: "Kategorie", value: "product_categories" },
  { label: "Nepřiřazeno", value: "unlinked" },
] as const;

const VARIANT_LABELS: { key: keyof Pick<MediaItemResponse, "thumbUrl" | "mediumUrl" | "largeUrl" | "ogUrl">; label: string }[] = [
  { key: "thumbUrl", label: "Thumb" },
  { key: "mediumUrl", label: "Medium" },
  { key: "largeUrl", label: "Large" },
  { key: "ogUrl", label: "OG" },
];

export function MediaPage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [source, setSource] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [page, setPage] = useState(1);
  const [selectedItem, setSelectedItem] = useState<MediaItemResponse | null>(
    null,
  );
  const [editAltText, setEditAltText] = useState("");

  const itemsQuery = useQuery({
    queryKey: ["media-items", source, typeFilter, search, page],
    queryFn: () =>
      mediaApi.getItems({
        source,
        type: typeFilter || undefined,
        search: search || undefined,
        page,
        limit: 24,
      }),
  });

  const multiUpload = useMultiUpload({});

  const updateAltTextMutation = useMutation({
    mutationFn: ({ id, altText }: { id: string; altText: string }) =>
      mediaApi.updateItem(id, { altText }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["media-items"] });
      if (selectedItem) {
        setSelectedItem({ ...selectedItem, altText: editAltText });
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => mediaApi.deleteItem(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["media-items"] });
      setSelectedItem(null);
    },
  });

  function handleUpload() {
    const files = fileInputRef.current?.files;
    if (files && files.length > 0) {
      multiUpload.addFiles(files);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleSelectItem(item: MediaItemResponse) {
    setSelectedItem(item);
    setEditAltText(item.altText ?? "");
  }

  function handleSaveAltText() {
    if (selectedItem) {
      updateAltTextMutation.mutate({
        id: selectedItem.id,
        altText: editAltText,
      });
    }
  }

  function handleDeleteItem() {
    if (
      selectedItem &&
      window.confirm(
        `Opravdu chcete smazat "${selectedItem.originalFilename}"?`,
      )
    ) {
      deleteMutation.mutate(selectedItem.id);
    }
  }

  const data = itemsQuery.data?.data;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold">Media</h2>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleUpload}
          />
          <Button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={multiUpload.isUploading}
          >
            {multiUpload.isUploading ? "Nahrávám..." : "Nahrát soubory"}
          </Button>
        </div>
      </div>

      {multiUpload.uploads.length > 0 && (
        <div className="mb-4">
          <UploadProgress
            uploads={multiUpload.uploads}
            onCancel={multiUpload.cancelUpload}
            onClearDone={multiUpload.clearDone}
          />
        </div>
      )}

      {/* Source filter tabs */}
      <div className="flex gap-1 mb-4">
        {SOURCES.map((s) => (
          <button
            key={s.label}
            type="button"
            onClick={() => { setSource(s.value); setPage(1); }}
            className={`px-3 py-1.5 text-sm rounded-md cursor-pointer ${
              source === s.value
                ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                : "bg-[var(--muted)] text-[var(--muted-foreground)] hover:bg-[var(--accent)]"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="mb-4 flex gap-3">
        <Input
          placeholder="Hledat..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="max-w-xs"
        />
        <select
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
        >
          <option value="">Všechny typy</option>
          <option value="IMAGE">Obrázky</option>
          <option value="DOCUMENT">Dokumenty</option>
          <option value="AUDIO">Audio</option>
          <option value="VIDEO">Video</option>
        </select>
      </div>

      <div className="flex gap-6">
        {/* Grid */}
        <div className="flex-1">
          {itemsQuery.isLoading && (
            <p className="py-8 text-center text-sm text-[var(--muted-foreground)]">
              Načítání...
            </p>
          )}

          {itemsQuery.isError && (
            <p className="py-8 text-center text-sm text-[var(--destructive)]">
              Nepodařilo se načíst soubory. Zkuste to prosím znovu.
            </p>
          )}

          {itemsQuery.isSuccess && (
            <>
              <MediaGrid
                items={data?.items ?? []}
                selectedId={selectedItem?.id}
                onSelect={handleSelectItem}
              />

              {/* Pagination */}
              {data && data.totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-sm text-[var(--muted-foreground)]">
                    Stranka {data.page} z {data.totalPages} (
                    {data.totalItems} souborů)
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      Předchozí
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= data.totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Další
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Detail panel */}
        {selectedItem && (
          <div className="w-72 shrink-0 rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
            <h3 className="mb-3 text-sm font-medium">Detail</h3>

            {selectedItem.mimeType.startsWith("image/") && (
              <img
                src={selectedItem.mediumUrl ?? selectedItem.originalUrl}
                alt={selectedItem.altText ?? selectedItem.originalFilename}
                className="mb-3 w-full rounded-md border border-[var(--border)] object-cover"
              />
            )}

            <p className="mb-1 truncate text-sm font-medium">
              {selectedItem.originalFilename}
            </p>
            <p className="mb-3 text-xs text-[var(--muted-foreground)]">
              {selectedItem.mimeType}
              {selectedItem.width != null &&
                selectedItem.height != null &&
                ` - ${selectedItem.width}x${selectedItem.height}`}
            </p>

            {/* Variant URLs */}
            {selectedItem.mimeType.startsWith("image/") && (
              <div className="mb-3">
                <p className="mb-1 text-xs font-medium text-[var(--muted-foreground)]">Varianty</p>
                <div className="space-y-1">
                  {VARIANT_LABELS.map(({ key, label }) => {
                    const url = selectedItem[key];
                    if (!url) return null;
                    return (
                      <a
                        key={key}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block truncate text-xs text-[var(--primary)] hover:underline"
                      >
                        {label}
                      </a>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mb-3">
              <Label htmlFor="altText" className="text-xs">
                Alt text
              </Label>
              <textarea
                id="altText"
                value={editAltText}
                onChange={(e) => setEditAltText(e.target.value)}
                rows={2}
                className={textareaClassName}
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="mt-1"
                onClick={handleSaveAltText}
                disabled={
                  updateAltTextMutation.isPending ||
                  editAltText === (selectedItem.altText ?? "")
                }
              >
                {updateAltTextMutation.isPending
                  ? "Ukládám..."
                  : "Uložit alt text"}
              </Button>
            </div>

            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="w-full"
              onClick={handleDeleteItem}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Mazání..." : "Smazat soubor"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
