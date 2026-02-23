"use client";

import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { t } from "@lingui/core/macro";
import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import type { MessageDescriptor } from "@lingui/core";
import {
  Upload,
  LayoutGrid,
  List,
  Trash2,
  Loader2,
} from "lucide-react";
import { mediaApi } from "@samofujera/api-client";
import type { MediaItemResponse } from "@samofujera/api-client";
import {
  Button,
  Input,
  Label,
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
  Tabs,
  TabsList,
  TabsTrigger,
  Textarea,
} from "@samofujera/ui";
import { PageHeader } from "@/components/dashboard/page-header";
import { MediaGridView } from "../media/media-grid-view";
import { MediaTableView } from "../media/media-table-view";
import { UploadProgress } from "../media/UploadProgress";
import { useMultiUpload } from "../media/useMultiUpload";

const SOURCES: Array<{ label: MessageDescriptor; value: string | undefined }> = [
  { label: msg`Vse`, value: undefined },
  { label: msg`Produkty`, value: "products" },
  { label: msg`Kategorie`, value: "product_categories" },
  { label: msg`Neprirazeno`, value: "unlinked" },
];

const VARIANT_LABELS: {
  key: keyof Pick<MediaItemResponse, "thumbUrl" | "mediumUrl" | "largeUrl" | "ogUrl">;
  label: string;
}[] = [
  { key: "thumbUrl", label: "Thumb" },
  { key: "mediumUrl", label: "Medium" },
  { key: "largeUrl", label: "Large" },
  { key: "ogUrl", label: "OG" },
];

type ViewMode = "grid" | "table";

export function MediaPage() {
  const { _ } = useLingui();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [source, setSource] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedItem, setSelectedItem] = useState<MediaItemResponse | null>(null);
  const [editAltText, setEditAltText] = useState("");

  const itemsQuery = useQuery({
    queryKey: ["media-items", source, typeFilter, search, page],
    queryFn: () =>
      mediaApi.getItems({
        source,
        type: typeFilter === "all" ? undefined : typeFilter,
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
      setSelectedIds((prev) => {
        const next = new Set(prev);
        // Remove any deleted IDs
        return next;
      });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) {
        await mediaApi.deleteItem(id);
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["media-items"] });
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

  function handleSelectItem(item: MediaItemResponse) {
    setSelectedItem(item);
    setEditAltText(item.altText ?? "");
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

  const handleToggleSelectAll = useCallback(() => {
    const items = itemsQuery.data?.data?.items ?? [];
    setSelectedIds((prev) => {
      const allSelected = items.every((i) => prev.has(i.id));
      if (allSelected) {
        return new Set();
      }
      return new Set(items.map((i) => i.id));
    });
  }, [itemsQuery.data]);

  function handleSaveAltText() {
    if (selectedItem) {
      updateAltTextMutation.mutate({
        id: selectedItem.id,
        altText: editAltText,
      });
    }
  }

  function handleDeleteItem(item?: MediaItemResponse) {
    const target = item ?? selectedItem;
    if (
      target &&
      window.confirm(t`Opravdu chcete smazat "${target.originalFilename}"?`)
    ) {
      deleteMutation.mutate(target.id);
    }
  }

  function handleBulkDelete() {
    if (selectedIds.size === 0) return;
    if (
      window.confirm(
        t`Opravdu chcete smazat ${selectedIds.size} vybranych souboru?`,
      )
    ) {
      bulkDeleteMutation.mutate(Array.from(selectedIds));
    }
  }

  const data = itemsQuery.data?.data;

  return (
    <div className="flex flex-1 flex-col gap-4 sm:gap-6">
      <PageHeader title={t`Media`} subtitle={t`Spravujte soubory a obrazky.`}>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleUpload}
        />
        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={multiUpload.isUploading}
        >
          <Upload className="mr-2 h-4 w-4" />
          {multiUpload.isUploading ? t`Nahravam...` : t`Nahrat soubory`}
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
        {/* Source tabs */}
        <div className="flex gap-1">
          {SOURCES.map((s) => (
            <button
              key={_(s.label)}
              type="button"
              onClick={() => {
                setSource(s.value);
                setPage(1);
              }}
              className={`cursor-pointer rounded-md px-3 py-1.5 text-sm ${
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

        <Select
          value={typeFilter}
          onValueChange={(value) => {
            setTypeFilter(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder={t`Vsechny typy`} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t`Vsechny typy`}</SelectItem>
            <SelectItem value="IMAGE">{t`Obrazky`}</SelectItem>
            <SelectItem value="DOCUMENT">{t`Dokumenty`}</SelectItem>
            <SelectItem value="AUDIO">{t`Audio`}</SelectItem>
            <SelectItem value="VIDEO">{t`Video`}</SelectItem>
          </SelectContent>
        </Select>

        <div className="ml-auto flex items-center gap-1">
          <Tabs
            value={viewMode}
            onValueChange={(v) => setViewMode(v as ViewMode)}
          >
            <TabsList className="h-9">
              <TabsTrigger value="grid" className="px-2.5">
                <LayoutGrid className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="table" className="px-2.5">
                <List className="h-4 w-4" />
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-md border bg-muted/50 px-4 py-2">
          <span className="text-sm text-muted-foreground">
            {t`Vybrano: ${selectedIds.size}`}
          </span>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleBulkDelete}
            disabled={bulkDeleteMutation.isPending}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {bulkDeleteMutation.isPending
              ? t`Mazani...`
              : t`Smazat vybrane`}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedIds(new Set())}
          >
            {t`Zrusit vyber`}
          </Button>
        </div>
      )}

      {/* Content area */}
      <div className="flex gap-6">
        <div className="min-w-0 flex-1">
          {itemsQuery.isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {itemsQuery.isError && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-6 text-center text-sm text-destructive">
              {t`Nepodarilo se nacist soubory. Zkuste to prosim znovu.`}
            </div>
          )}

          {itemsQuery.isSuccess && (
            <>
              {viewMode === "grid" ? (
                <MediaGridView
                  items={data?.items ?? []}
                  selectedIds={selectedIds}
                  onToggleSelect={handleToggleSelect}
                  onItemClick={handleSelectItem}
                />
              ) : (
                <MediaTableView
                  items={data?.items ?? []}
                  selectedIds={selectedIds}
                  onToggleSelect={handleToggleSelect}
                  onToggleSelectAll={handleToggleSelectAll}
                  onItemClick={handleSelectItem}
                  onDeleteItem={(item) => handleDeleteItem(item)}
                />
              )}

              {/* Pagination */}
              {data && data.totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {t`Stranka ${data.page} z ${data.totalPages} (${data.totalItems} souboru)`}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      {t`Predchozi`}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= data.totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      {t`Dalsi`}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Detail panel */}
        {selectedItem && (
          <div className="w-72 shrink-0 rounded-lg border bg-card p-4">
            <h3 className="mb-3 text-sm font-medium">{t`Detail`}</h3>

            {selectedItem.mimeType.startsWith("image/") && (
              <img
                src={selectedItem.mediumUrl ?? selectedItem.originalUrl}
                alt={selectedItem.altText ?? selectedItem.originalFilename}
                className="mb-3 w-full rounded-md border object-cover"
              />
            )}

            <p className="mb-1 truncate text-sm font-medium">
              {selectedItem.originalFilename}
            </p>
            <p className="mb-3 text-xs text-muted-foreground">
              {selectedItem.mimeType}
              {selectedItem.width != null &&
                selectedItem.height != null &&
                ` - ${selectedItem.width}x${selectedItem.height}`}
            </p>

            {/* Variant URLs */}
            {selectedItem.mimeType.startsWith("image/") && (
              <div className="mb-3">
                <p className="mb-1 text-xs font-medium text-muted-foreground">
                  {t`Varianty`}
                </p>
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
                        className="block truncate text-xs text-primary hover:underline"
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
                {t`Alt text`}
              </Label>
              <Textarea
                id="altText"
                value={editAltText}
                onChange={(e) => setEditAltText(e.target.value)}
                rows={2}
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
                  ? t`Ukladam...`
                  : t`Ulozit alt text`}
              </Button>
            </div>

            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="w-full"
              onClick={() => handleDeleteItem()}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? t`Mazani...` : t`Smazat soubor`}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
