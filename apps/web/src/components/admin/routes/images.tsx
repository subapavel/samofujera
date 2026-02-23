"use client";

import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { t } from "@lingui/core/macro";
import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import type { MessageDescriptor } from "@lingui/core";
import {
  Upload,
  Trash2,
  Loader2,
  AlertTriangle,
  X,
  Save,
  ExternalLink,
} from "lucide-react";
import { imageApi } from "@samofujera/api-client";
import type { ImageDetailResponse } from "@samofujera/api-client";
import {
  Button,
  Input,
  Label,
  Textarea,
  Card,
  CardContent,
  Badge,
  Checkbox,
  Separator,
} from "@samofujera/ui";
import { PageHeader } from "@/components/dashboard/page-header";
import { UploadProgress } from "../images/UploadProgress";
import { useMultiUpload } from "../images/useMultiUpload";
import { formatFileSize } from "../images/format-file-size";

const SOURCES: Array<{ label: MessageDescriptor; value: string | undefined }> = [
  { label: msg`Vše`, value: undefined },
  { label: msg`Produkty`, value: "products" },
  { label: msg`Kategorie`, value: "product_categories" },
  { label: msg`Nepřiřazené`, value: "unlinked" },
];

export function ImagesPage() {
  const { _ } = useLingui();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const [source, setSource] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedItem, setSelectedItem] = useState<ImageDetailResponse | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editAltText, setEditAltText] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);

  const imagesQuery = useQuery({
    queryKey: ["images", source, search, page],
    queryFn: () =>
      imageApi.getImages({
        source,
        search: search || undefined,
        page,
        limit: 24,
      }),
  });

  const multiUpload = useMultiUpload({});

  const updateImageMutation = useMutation({
    mutationFn: ({ id, title, altText }: { id: string; title?: string; altText?: string }) =>
      imageApi.updateImage(id, { title, altText }),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: ["images"] });
      if (selectedItem && selectedItem.id === variables.id) {
        setSelectedItem({
          ...selectedItem,
          title: variables.title ?? selectedItem.title,
          altText: variables.altText ?? selectedItem.altText,
        });
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => imageApi.deleteImage(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["images"] });
      setSelectedItem(null);
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) {
        await imageApi.deleteImage(id);
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["images"] });
      setSelectedIds(new Set());
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

  function handleSelectItem(item: ImageDetailResponse) {
    setSelectedItem(item);
    setEditTitle(item.title ?? "");
    setEditAltText(item.altText ?? "");
  }

  function handleCloseDetail() {
    setSelectedItem(null);
  }

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  function handleSaveDetail() {
    if (selectedItem) {
      updateImageMutation.mutate({
        id: selectedItem.id,
        title: editTitle || undefined,
        altText: editAltText || undefined,
      });
    }
  }

  function handleDeleteItem() {
    if (
      selectedItem &&
      window.confirm(t`Opravdu chcete smazat "${selectedItem.originalFilename}"?`)
    ) {
      deleteMutation.mutate(selectedItem.id);
    }
  }

  function handleBulkDelete() {
    if (selectedIds.size === 0) return;
    if (
      window.confirm(
        t`Opravdu chcete smazat ${selectedIds.size} vybraných obrázků?`,
      )
    ) {
      bulkDeleteMutation.mutate(Array.from(selectedIds));
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      multiUpload.addFiles(files);
    }
  }

  const data = imagesQuery.data?.data;
  const items = data?.items ?? [];
  const hasDetailDirty =
    selectedItem !== null &&
    (editTitle !== (selectedItem.title ?? "") ||
      editAltText !== (selectedItem.altText ?? ""));

  return (
    <div className="flex flex-1 flex-col gap-4 sm:gap-6">
      <PageHeader
        title={t`Knihovna obrázků`}
        subtitle={
          data
            ? t`${data.totalItems} obrázků celkem`
            : t`Spravujte obrázky pro produkty a stránky.`
        }
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={handleUpload}
        />
        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={multiUpload.isUploading}
        >
          <Upload className="mr-2 h-4 w-4" />
          {multiUpload.isUploading ? t`Nahrávám...` : t`Nahrát obrázky`}
        </Button>
      </PageHeader>

      {multiUpload.uploads.length > 0 && (
        <UploadProgress
          uploads={multiUpload.uploads}
          onCancel={multiUpload.cancelUpload}
          onClearDone={multiUpload.clearDone}
        />
      )}

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Source pills */}
        <div className="flex gap-1">
          {SOURCES.map((s) => (
            <button
              key={_(s.label)}
              type="button"
              onClick={() => {
                setSource(s.value);
                setPage(1);
              }}
              className={`cursor-pointer rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                source === s.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              }`}
            >
              {_(s.label)}
            </button>
          ))}
        </div>

        <div className="h-6 w-px bg-border" />

        <Input
          placeholder={t`Hledat...`}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="max-w-xs"
        />
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-md border bg-muted/50 px-4 py-2">
          <span className="text-sm text-muted-foreground">
            {t`Vybráno: ${selectedIds.size}`}
          </span>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleBulkDelete}
            disabled={bulkDeleteMutation.isPending}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {bulkDeleteMutation.isPending
              ? t`Mažu...`
              : t`Smazat vybrané`}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedIds(new Set())}
          >
            {t`Zrušit výběr`}
          </Button>
        </div>
      )}

      {/* Content area with drag-drop zone */}
      <div
        ref={dropZoneRef}
        className={`flex gap-6 ${isDragOver ? "rounded-lg ring-2 ring-primary ring-offset-2" : ""}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Grid */}
        <div className="min-w-0 flex-1">
          {imagesQuery.isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {imagesQuery.isError && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-6 text-center text-sm text-destructive">
              {t`Nepodařilo se načíst obrázky. Zkuste to prosím znovu.`}
            </div>
          )}

          {imagesQuery.isSuccess && items.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-muted-foreground">
                {t`Zatím žádné obrázky. Nahrajte první obrázek přetažením nebo tlačítkem výše.`}
              </p>
            </div>
          )}

          {imagesQuery.isSuccess && items.length > 0 && (
            <>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {items.map((item) => {
                  const isSelected = selectedIds.has(item.id);
                  const isActive = selectedItem?.id === item.id;
                  const missingMeta = !item.altText || !item.title;

                  return (
                    <Card
                      key={item.id}
                      className={`group relative cursor-pointer transition-colors hover:bg-accent/50 ${
                        isActive ? "ring-2 ring-primary" : isSelected ? "ring-2 ring-ring" : ""
                      }`}
                    >
                      {/* Checkbox on hover */}
                      <div
                        className={`absolute top-2 left-2 z-10 transition-opacity ${
                          isSelected
                            ? "opacity-100"
                            : "opacity-0 group-hover:opacity-100"
                        }`}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleToggleSelect(item.id)}
                          aria-label={t`Vybrat ${item.originalFilename}`}
                          className="bg-background"
                        />
                      </div>

                      {/* Warning badge */}
                      {missingMeta && (
                        <div className="absolute top-2 right-2 z-10">
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                        </div>
                      )}

                      <CardContent
                        className="p-2"
                        onClick={() => handleSelectItem(item)}
                      >
                        {/* 4:3 thumbnail */}
                        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-md bg-muted">
                          <img
                            src={item.url}
                            alt={item.altText ?? item.originalFilename}
                            className="h-full w-full object-cover"
                          />
                        </div>

                        <div className="mt-2 space-y-1">
                          <p className="truncate text-sm font-medium">
                            {item.title ?? item.originalFilename}
                          </p>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            {item.width != null && item.height != null && (
                              <span>{item.width}x{item.height}</span>
                            )}
                            <span>{formatFileSize(item.fileSizeBytes)}</span>
                          </div>
                          {item.usedIn.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {item.usedIn.slice(0, 2).map((usage, idx) => (
                                <Badge key={idx} variant="secondary" className="text-[10px]">
                                  {usage.entityName}
                                </Badge>
                              ))}
                              {item.usedIn.length > 2 && (
                                <Badge variant="secondary" className="text-[10px]">
                                  +{item.usedIn.length - 2}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Pagination */}
              {data && data.totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {t`Stránka ${data.page} z ${data.totalPages} (${data.totalItems} obrázků)`}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      {t`Předchozí`}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= data.totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      {t`Další`}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Detail side panel */}
        {selectedItem && (
          <div className="w-80 shrink-0 rounded-lg border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-medium">{t`Detail obrázku`}</h3>
              <button
                type="button"
                onClick={handleCloseDetail}
                className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Large preview */}
            <div className="mb-4 overflow-hidden rounded-md border bg-muted">
              <img
                src={selectedItem.url}
                alt={selectedItem.altText ?? selectedItem.originalFilename}
                className="w-full object-contain"
                style={{ maxHeight: "240px" }}
              />
            </div>

            {/* Metadata grid */}
            <div className="mb-4 grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">{t`Soubor`}</span>
                <p className="truncate font-medium">{selectedItem.originalFilename}</p>
              </div>
              <div>
                <span className="text-muted-foreground">{t`Typ`}</span>
                <p className="font-medium">{selectedItem.mimeType}</p>
              </div>
              {selectedItem.width != null && selectedItem.height != null && (
                <div>
                  <span className="text-muted-foreground">{t`Rozměry`}</span>
                  <p className="font-medium">{selectedItem.width}x{selectedItem.height}</p>
                </div>
              )}
              <div>
                <span className="text-muted-foreground">{t`Velikost`}</span>
                <p className="font-medium">{formatFileSize(selectedItem.fileSizeBytes)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">{t`Nahráno`}</span>
                <p className="font-medium">
                  {new Date(selectedItem.createdAt).toLocaleDateString("cs-CZ")}
                </p>
              </div>
            </div>

            <Separator className="mb-4" />

            {/* Title input */}
            <div className="mb-3">
              <Label htmlFor="imageTitle" className="text-xs">
                {t`Titulek`}
              </Label>
              <Input
                id="imageTitle"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder={t`Titulek obrázku`}
                className="mt-1"
              />
            </div>

            {/* Alt text textarea */}
            <div className="mb-3">
              <Label htmlFor="imageAltText" className="text-xs">
                {t`Alt text`}
              </Label>
              <Textarea
                id="imageAltText"
                value={editAltText}
                onChange={(e) => setEditAltText(e.target.value)}
                placeholder={t`Popis obrázku pro čtečky obrazovky`}
                rows={2}
                className="mt-1"
              />
              {!selectedItem.altText && (
                <p className="mt-1 flex items-center gap-1 text-xs text-amber-600">
                  <AlertTriangle className="h-3 w-3" />
                  {t`Chybí alt text — důležité pro přístupnost a SEO.`}
                </p>
              )}
            </div>

            {/* Used in */}
            {selectedItem.usedIn.length > 0 && (
              <div className="mb-4">
                <p className="mb-1 text-xs font-medium text-muted-foreground">
                  {t`Použito v`}
                </p>
                <div className="space-y-1">
                  {selectedItem.usedIn.map((usage, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 text-xs"
                    >
                      <Badge variant="outline" className="text-[10px]">
                        {usage.entityType}
                      </Badge>
                      <span className="truncate">{usage.entityName}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Separator className="mb-4" />

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                className="flex-1"
                onClick={handleSaveDetail}
                disabled={
                  updateImageMutation.isPending || !hasDetailDirty
                }
              >
                <Save className="mr-2 h-4 w-4" />
                {updateImageMutation.isPending
                  ? t`Ukládám...`
                  : t`Uložit`}
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleDeleteItem}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            {/* Direct URL link */}
            <a
              href={selectedItem.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <ExternalLink className="h-3 w-3" />
              {t`Otevřít originál`}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
