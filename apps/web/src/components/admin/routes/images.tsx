"use client";

import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { t, msg, plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import type { MessageDescriptor } from "@lingui/core";
import {
  Upload,
  Trash2,
  Loader2,
  AlertTriangle,
  Save,
  ExternalLink,
  ImagePlus,
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@samofujera/ui";
import { PageHeader } from "@/components/dashboard/page-header";
import { UploadProgress } from "../images/UploadProgress";
import { useMultiUpload } from "../images/useMultiUpload";
import { formatFileSize } from "../images/format-file-size";

function usageTypeLabel(entityType: string): string {
  switch (entityType) {
    case "product":
      return t`Produkt`;
    case "category":
      return t`Kategorie`;
    case "page":
    case "page_og":
      return t`Stránka`;
    default:
      return entityType;
  }
}

const SOURCES: Array<{ label: MessageDescriptor; value: string | undefined }> = [
  { label: msg`Vše`, value: undefined },
  { label: msg`Produkty`, value: "products" },
  { label: msg`Kategorie`, value: "product_categories" },
  { label: msg`Stránky`, value: "pages" },
  { label: msg`Nepřiřazené`, value: "unlinked" },
];

export function ImagesPage() {
  const { _ } = useLingui();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        plural(selectedIds.size, {
          one: "Opravdu chcete smazat # vybraný obrázek?",
          few: "Opravdu chcete smazat # vybrané obrázky?",
          many: "Opravdu chcete smazat # vybraných obrázků?",
          other: "Opravdu chcete smazat # vybraných obrázků?",
        }),
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
        title={t`Obrázky`}
        subtitle={
          data
            ? plural(data.totalItems, {
                one: "# obrázek celkem",
                few: "# obrázky celkem",
                many: "# obrázků celkem",
                other: "# obrázků celkem",
              })
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
            {plural(selectedIds.size, {
              one: "Vybrán # obrázek",
              few: "Vybrány # obrázky",
              many: "Vybráno # obrázků",
              other: "Vybráno # obrázků",
            })}
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

      {/* Upload dropzone */}
      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed px-6 py-8 text-center transition-all ${
          isDragOver
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 bg-muted/30 hover:border-muted-foreground/40 hover:bg-muted/50"
        }`}
      >
        <ImagePlus
          className={`mb-2 h-8 w-8 ${isDragOver ? "text-primary" : "text-muted-foreground/50"}`}
        />
        <p className={`text-sm font-medium ${isDragOver ? "text-primary" : "text-muted-foreground"}`}>
          {isDragOver ? t`Pusťte soubory zde` : t`Přetáhněte obrázky sem`}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {t`nebo klikněte pro výběr`} &middot; JPEG, PNG, WebP, SVG &middot; max 20 MB
        </p>
      </div>

      {/* Grid */}
      <div>
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
              {t`Zatím žádné obrázky.`}
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
                                {usage.entityType === "page_og" && ` (${t`OG obrázek`})`}
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
                  {t`Stránka ${data.page} z ${data.totalPages} (${plural(data.totalItems, {
                    one: "# obrázek",
                    few: "# obrázky",
                    many: "# obrázků",
                    other: "# obrázků",
                  })})`}
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

      {/* Detail sheet (slide-in drawer) */}
      <Sheet open={selectedItem !== null} onOpenChange={(open) => { if (!open) handleCloseDetail(); }}>
        <SheetContent side="right" className="flex w-full flex-col overflow-y-auto sm:max-w-md">
          {selectedItem && (
            <>
              <SheetHeader>
                <SheetTitle>{t`Detail obrázku`}</SheetTitle>
                <SheetDescription>
                  {selectedItem.originalFilename}
                </SheetDescription>
              </SheetHeader>

              {/* Large preview */}
              <div className="overflow-hidden rounded-md border bg-muted">
                <img
                  src={selectedItem.url}
                  alt={selectedItem.altText ?? selectedItem.originalFilename}
                  className="w-full object-contain"
                  style={{ maxHeight: "300px" }}
                />
              </div>

              {/* Metadata grid */}
              <div className="grid grid-cols-2 gap-3 rounded-md bg-muted/50 p-3 text-xs">
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

              <Separator />

              {/* Title input */}
              <div>
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
              <div>
                <Label htmlFor="imageAltText" className="text-xs">
                  {t`Alt text`}
                </Label>
                <Textarea
                  id="imageAltText"
                  value={editAltText}
                  onChange={(e) => setEditAltText(e.target.value)}
                  placeholder={t`Popis obrázku pro čtečky obrazovky`}
                  rows={3}
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
                <div>
                  <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                    {t`Použito v`}
                  </p>
                  <div className="space-y-1.5">
                    {selectedItem.usedIn.map((usage, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs"
                      >
                        <Badge variant="outline" className="text-[10px]">
                          {usageTypeLabel(usage.entityType)}
                        </Badge>
                        <span className="truncate">
                          {usage.entityName}
                          {usage.entityType === "page_og" && (
                            <span className="text-muted-foreground">{" "}({t`OG obrázek`})</span>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Separator />

              {/* Actions */}
              <SheetFooter className="flex-row gap-2 sm:justify-start">
                <Button
                  type="button"
                  size="sm"
                  className="flex-1"
                  onClick={handleSaveDetail}
                  disabled={updateImageMutation.isPending || !hasDetailDirty}
                >
                  <Save className="mr-2 h-4 w-4" />
                  {updateImageMutation.isPending ? t`Ukládám...` : t`Uložit`}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteItem}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {t`Smazat`}
                </Button>
              </SheetFooter>

              {/* Direct URL link */}
              <a
                href={selectedItem.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                {t`Otevřít originál`}
              </a>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
