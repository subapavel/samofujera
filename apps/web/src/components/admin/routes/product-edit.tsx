"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useParams } from "next/navigation";
import { t } from "@lingui/core/macro";
import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import type { MessageDescriptor } from "@lingui/core";
import { adminApi, catalogApi, mediaApi } from "@samofujera/api-client";
import type {
  ProductType,
  FileResponse,
  MediaResponse,
  ImageResponse,
  VariantResponse,
  CreateVariantRequest,
  CategoryResponse,
} from "@samofujera/api-client";
import {
  Button,
  Input,
  Label,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@samofujera/ui";
import { MediaPicker } from "../media/MediaPicker";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const PRODUCT_TYPES: Array<{ value: ProductType; label: MessageDescriptor }> = [
  { value: "PHYSICAL", label: msg`Fyzický produkt` },
  { value: "EBOOK", label: msg`E-book` },
  { value: "AUDIO_VIDEO", label: msg`Audio/Video` },
  { value: "ONLINE_EVENT", label: msg`Online událost` },
  { value: "RECURRING_EVENT", label: msg`Opakovaná událost` },
  { value: "OFFLINE_EVENT", label: msg`Offline událost` },
];

const selectClassName =
  "flex w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm";

const textareaClassName =
  "flex w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm ring-offset-[var(--background)] placeholder:text-[var(--muted-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2";

// ---- Gallery Tab ----

function GalleryTab({
  productId,
  images,
  onInvalidate,
}: {
  productId: string;
  images: ImageResponse[];
  onInvalidate: () => Promise<void>;
}) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [dragSourceIndex, setDragSourceIndex] = useState<number | null>(null);
  const [pickerValue, setPickerValue] = useState<string | null>(null);

  const uploadAndLinkMutation = useMutation({
    mutationFn: async (file: File) => {
      const uploadResult = await mediaApi.uploadDirect(file);
      const mediaItemId = uploadResult.data.id;
      await adminApi.linkImage(productId, mediaItemId);
    },
    onSuccess: async () => {
      await onInvalidate();
      if (imageInputRef.current) imageInputRef.current.value = "";
    },
  });

  const linkImageMutation = useMutation({
    mutationFn: (mediaItemId: string) => adminApi.linkImage(productId, mediaItemId),
    onSuccess: onInvalidate,
  });

  const unlinkImageMutation = useMutation({
    mutationFn: (mediaItemId: string) => adminApi.unlinkImage(productId, mediaItemId),
    onSuccess: onInvalidate,
  });

  const reorderMutation = useMutation({
    mutationFn: (mediaItemIds: string[]) => adminApi.reorderImages(productId, mediaItemIds),
    onSuccess: onInvalidate,
  });

  function handleUploadImage() {
    const file = imageInputRef.current?.files?.[0];
    if (file) uploadAndLinkMutation.mutate(file);
  }

  function handleUnlinkImage(image: ImageResponse) {
    if (window.confirm(t`Opravdu chcete odebrat tento obrázek z galerie?`)) {
      unlinkImageMutation.mutate(image.mediaItemId);
    }
  }

  function handlePickerChange(id: string | null) {
    setPickerValue(id);
    if (id) {
      const alreadyLinked = images.some((img) => img.mediaItemId === id);
      if (!alreadyLinked) {
        linkImageMutation.mutate(id);
      }
      setPickerValue(null);
    }
  }

  function handleDragStart(index: number) {
    setDragSourceIndex(index);
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    setDragOverIndex(index);
  }

  function handleDrop(targetIndex: number) {
    if (dragSourceIndex === null || dragSourceIndex === targetIndex) {
      setDragOverIndex(null);
      setDragSourceIndex(null);
      return;
    }
    const newOrder = [...images];
    const [moved] = newOrder.splice(dragSourceIndex, 1);
    newOrder.splice(targetIndex, 0, moved);
    reorderMutation.mutate(newOrder.map((img) => img.mediaItemId));
    setDragOverIndex(null);
    setDragSourceIndex(null);
  }

  const isPending =
    uploadAndLinkMutation.isPending ||
    linkImageMutation.isPending ||
    unlinkImageMutation.isPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t`Galerie obrázků`}</CardTitle>
      </CardHeader>
      <CardContent>
        {images.length > 0 ? (
          <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {images.map((image, index) => (
              <div
                key={image.mediaItemId}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={() => handleDrop(index)}
                onDragEnd={() => { setDragOverIndex(null); setDragSourceIndex(null); }}
                className={`group relative cursor-grab rounded-md border border-[var(--border)] p-2 ${
                  dragOverIndex === index ? "ring-2 ring-[var(--ring)]" : ""
                }`}
              >
                <img
                  src={image.thumbUrl ?? image.originalUrl}
                  alt={image.altText ?? ""}
                  className="aspect-square w-full rounded object-cover"
                />
                {image.altText && (
                  <div className="mt-1.5">
                    <p className="truncate text-xs text-[var(--muted-foreground)]">
                      {image.altText}
                    </p>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => handleUnlinkImage(image)}
                  disabled={unlinkImageMutation.isPending}
                  className="absolute right-1 top-1 hidden rounded bg-[var(--destructive)] px-1.5 py-0.5 text-xs text-[var(--destructive-foreground)] group-hover:block"
                >
                  X
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="mb-4 text-sm text-[var(--muted-foreground)]">
            {t`Žádné nahrané obrázky.`}
          </p>
        )}

        <div className="flex items-end gap-3">
          <div className="flex-1">
            <Label htmlFor="imageUpload">{t`Nahrát obrázek`}</Label>
            <input
              ref={imageInputRef}
              id="imageUpload"
              type="file"
              accept="image/*"
              className="block w-full text-sm text-[var(--muted-foreground)] file:mr-2 file:rounded-md file:border-0 file:bg-[var(--primary)] file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-[var(--primary-foreground)]"
            />
          </div>
          <Button
            type="button"
            onClick={handleUploadImage}
            disabled={isPending}
          >
            {uploadAndLinkMutation.isPending ? t`Nahrávám...` : t`Nahrát`}
          </Button>
        </div>

        <div className="mt-3">
          <MediaPicker
            value={pickerValue}
            onChange={handlePickerChange}
            accept="image/*"
          />
        </div>

        {(uploadAndLinkMutation.isError || linkImageMutation.isError) && (
          <p className="mt-2 text-sm text-[var(--destructive)]">
            {t`Nepodařilo se přidat obrázek. Zkuste to prosím znovu.`}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ---- Variants Tab ----

interface VariantFormRow {
  id?: string;
  name: string;
  sku: string;
  stock: string;
  sortOrder: string;
  priceCZK: string;
  priceEUR: string;
  isNew: boolean;
  isDirty: boolean;
}

function VariantsTab({
  productId,
  variants,
  onInvalidate,
}: {
  productId: string;
  variants: VariantResponse[];
  onInvalidate: () => Promise<void>;
}) {
  const [rows, setRows] = useState<VariantFormRow[]>([]);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!initialized && variants) {
      setRows(
        variants.map((v) => ({
          id: v.id,
          name: v.name,
          sku: v.sku,
          stock: String(v.stock),
          sortOrder: String(v.sortOrder),
          priceCZK: v.prices.CZK != null ? String(v.prices.CZK) : "",
          priceEUR: v.prices.EUR != null ? String(v.prices.EUR) : "",
          isNew: false,
          isDirty: false,
        })),
      );
      setInitialized(true);
    }
  }, [variants, initialized]);

  const createVariantMutation = useMutation({
    mutationFn: (data: CreateVariantRequest) => adminApi.createVariant(productId, data),
    onSuccess: async () => {
      setInitialized(false);
      await onInvalidate();
    },
  });

  const updateVariantMutation = useMutation({
    mutationFn: ({ variantId, data }: { variantId: string; data: CreateVariantRequest }) =>
      adminApi.updateVariant(productId, variantId, data),
    onSuccess: async () => {
      setInitialized(false);
      await onInvalidate();
    },
  });

  const deleteVariantMutation = useMutation({
    mutationFn: (variantId: string) => adminApi.deleteVariant(productId, variantId),
    onSuccess: async () => {
      setInitialized(false);
      await onInvalidate();
    },
  });

  function addRow() {
    setRows((prev) => [
      ...prev,
      {
        name: "",
        sku: "",
        stock: "0",
        sortOrder: String(prev.length),
        priceCZK: "",
        priceEUR: "",
        isNew: true,
        isDirty: true,
      },
    ]);
  }

  function updateRow(index: number, field: keyof VariantFormRow, value: string) {
    setRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value, isDirty: true } : row)),
    );
  }

  function buildRequest(row: VariantFormRow): CreateVariantRequest {
    const prices: Record<string, number> = {};
    if (row.priceCZK) prices.CZK = Number(row.priceCZK);
    if (row.priceEUR) prices.EUR = Number(row.priceEUR);
    return {
      name: row.name,
      sku: row.sku,
      stock: Number(row.stock),
      sortOrder: Number(row.sortOrder),
      prices,
    };
  }

  function handleSaveRow(index: number) {
    const row = rows[index];
    const data = buildRequest(row);
    if (row.isNew) {
      createVariantMutation.mutate(data);
    } else if (row.id) {
      updateVariantMutation.mutate({ variantId: row.id, data });
    }
  }

  function handleDeleteRow(index: number) {
    const row = rows[index];
    if (row.isNew) {
      setRows((prev) => prev.filter((_, i) => i !== index));
    } else if (row.id) {
      if (window.confirm(t`Opravdu chcete smazat variantu "${row.name}"?`)) {
        deleteVariantMutation.mutate(row.id);
      }
    }
  }

  const isPending =
    createVariantMutation.isPending ||
    updateVariantMutation.isPending ||
    deleteVariantMutation.isPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t`Varianty`}</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--muted-foreground)]">
                  <th className="px-2 py-2">{t`Název`}</th>
                  <th className="px-2 py-2">SKU</th>
                  <th className="px-2 py-2 w-20">{t`Sklad`}</th>
                  <th className="px-2 py-2 w-24">CZK</th>
                  <th className="px-2 py-2 w-24">EUR</th>
                  <th className="px-2 py-2 w-32">{t`Akce`}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={row.id ?? `new-${index}`} className="border-b border-[var(--border)]">
                    <td className="px-2 py-1.5">
                      <Input
                        value={row.name}
                        onChange={(e) => updateRow(index, "name", e.target.value)}
                        disabled={isPending}
                        className="h-8"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <Input
                        value={row.sku}
                        onChange={(e) => updateRow(index, "sku", e.target.value)}
                        disabled={isPending}
                        className="h-8"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <Input
                        type="number"
                        min="0"
                        value={row.stock}
                        onChange={(e) => updateRow(index, "stock", e.target.value)}
                        disabled={isPending}
                        className="h-8"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={row.priceCZK}
                        onChange={(e) => updateRow(index, "priceCZK", e.target.value)}
                        placeholder="0.00"
                        disabled={isPending}
                        className="h-8"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={row.priceEUR}
                        onChange={(e) => updateRow(index, "priceEUR", e.target.value)}
                        placeholder="0.00"
                        disabled={isPending}
                        className="h-8"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <div className="flex gap-1">
                        {row.isDirty && (
                          <Button
                            size="sm"
                            onClick={() => handleSaveRow(index)}
                            disabled={isPending || !row.name || !row.sku}
                            className="h-8"
                          >
                            {t`Uložit`}
                          </Button>
                        )}
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteRow(index)}
                          disabled={isPending}
                          className="h-8"
                        >
                          {t`Smazat`}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mb-4 text-sm text-[var(--muted-foreground)]">
            {t`Žádné varianty. Přidejte první variantu níže.`}
          </p>
        )}

        <Button type="button" variant="outline" onClick={addRow} disabled={isPending} className="mt-4">
          {t`Přidat variantu`}
        </Button>

        {(createVariantMutation.isError || updateVariantMutation.isError || deleteVariantMutation.isError) && (
          <p className="mt-2 text-sm text-[var(--destructive)]">
            {t`Operace se nezdařila. Zkuste to prosím znovu.`}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ---- Files Tab (EBOOK) ----

function FilesTab({
  productId,
  files,
  onInvalidate,
}: {
  productId: string;
  files: FileResponse[];
  onInvalidate: () => Promise<void>;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadFileMutation = useMutation({
    mutationFn: (file: File) => adminApi.uploadFile(productId, file),
    onSuccess: async () => {
      await onInvalidate();
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
  });

  const deleteFileMutation = useMutation({
    mutationFn: (fileId: string) => adminApi.deleteFile(productId, fileId),
    onSuccess: onInvalidate,
  });

  function handleUploadFile() {
    const file = fileInputRef.current?.files?.[0];
    if (file) uploadFileMutation.mutate(file);
  }

  function handleDeleteFile(file: FileResponse) {
    if (window.confirm(t`Opravdu chcete smazat soubor "${file.fileName}"?`)) {
      deleteFileMutation.mutate(file.id);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t`Soubory ke stažení`}</CardTitle>
      </CardHeader>
      <CardContent>
        {files.length > 0 ? (
          <div className="mb-4 space-y-2">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between rounded-md border border-[var(--border)] p-3"
              >
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">{file.fileName}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {file.mimeType} &middot; {formatFileSize(file.fileSizeBytes)}
                  </p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={deleteFileMutation.isPending}
                  onClick={() => handleDeleteFile(file)}
                >
                  {t`Smazat`}
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="mb-4 text-sm text-[var(--muted-foreground)]">
            {t`Žádné nahrané soubory.`}
          </p>
        )}

        <div className="flex items-end gap-3">
          <div className="flex-1">
            <Label htmlFor="fileUpload">{t`Nahrát soubor`}</Label>
            <input
              ref={fileInputRef}
              id="fileUpload"
              type="file"
              className="block w-full text-sm text-[var(--muted-foreground)] file:mr-2 file:rounded-md file:border-0 file:bg-[var(--primary)] file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-[var(--primary-foreground)]"
            />
          </div>
          <Button
            type="button"
            onClick={handleUploadFile}
            disabled={uploadFileMutation.isPending}
          >
            {uploadFileMutation.isPending ? t`Nahrávám...` : t`Nahrát`}
          </Button>
        </div>

        {uploadFileMutation.isError && (
          <p className="mt-2 text-sm text-[var(--destructive)]">
            {t`Nepodařilo se nahrát soubor. Zkuste to prosím znovu.`}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ---- Media Tab (AUDIO_VIDEO) ----

function MediaTab({
  productId,
  mediaItems,
  onInvalidate,
}: {
  productId: string;
  mediaItems: MediaResponse[];
  onInvalidate: () => Promise<void>;
}) {
  const [mediaTitle, setMediaTitle] = useState("");
  const [mediaType, setMediaType] = useState<"VIDEO" | "AUDIO">("VIDEO");
  const [cfStreamUid, setCfStreamUid] = useState("");
  const [mediaSortOrder, setMediaSortOrder] = useState("0");

  const createMediaMutation = useMutation({
    mutationFn: () =>
      adminApi.createMedia(productId, {
        title: mediaTitle,
        mediaType,
        cfStreamUid: cfStreamUid || undefined,
        sortOrder: Number(mediaSortOrder),
      }),
    onSuccess: async () => {
      await onInvalidate();
      setMediaTitle("");
      setCfStreamUid("");
      setMediaSortOrder("0");
    },
  });

  const deleteMediaMutation = useMutation({
    mutationFn: (mediaId: string) => adminApi.deleteMedia(productId, mediaId),
    onSuccess: onInvalidate,
  });

  function handleCreateMedia(event: React.FormEvent) {
    event.preventDefault();
    createMediaMutation.mutate();
  }

  function handleDeleteMedia(media: MediaResponse) {
    if (window.confirm(t`Opravdu chcete smazat "${media.title}"?`)) {
      deleteMediaMutation.mutate(media.id);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t`Média`}</CardTitle>
      </CardHeader>
      <CardContent>
        {mediaItems.length > 0 ? (
          <div className="mb-4 space-y-2">
            {mediaItems.map((media) => (
              <div
                key={media.id}
                className="flex items-center justify-between rounded-md border border-[var(--border)] p-3"
              >
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">{media.title}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {media.mediaType}
                    {media.durationSeconds != null &&
                      ` \u00b7 ${Math.floor(media.durationSeconds / 60)}:${String(media.durationSeconds % 60).padStart(2, "0")}`}
                    {media.cfStreamUid && ` \u00b7 CF: ${media.cfStreamUid.slice(0, 8)}...`}
                  </p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={deleteMediaMutation.isPending}
                  onClick={() => handleDeleteMedia(media)}
                >
                  {t`Smazat`}
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="mb-4 text-sm text-[var(--muted-foreground)]">
            {t`Žádná přidaná média.`}
          </p>
        )}

        <form onSubmit={handleCreateMedia} className="space-y-3 rounded-md border border-[var(--border)] p-4">
          <p className="text-sm font-medium">{t`Přidat médium`}</p>
          <div className="flex gap-3">
            <div className="flex-1">
              <Label htmlFor="mediaTitle" className="text-xs">
                {t`Název`}
              </Label>
              <Input
                id="mediaTitle"
                value={mediaTitle}
                onChange={(e) => setMediaTitle(e.target.value)}
                required
                disabled={createMediaMutation.isPending}
              />
            </div>
            <div className="w-32">
              <Label htmlFor="mediaType" className="text-xs">
                {t`Typ`}
              </Label>
              <select
                id="mediaType"
                value={mediaType}
                onChange={(e) => setMediaType(e.target.value as "VIDEO" | "AUDIO")}
                disabled={createMediaMutation.isPending}
                className={selectClassName}
              >
                <option value="VIDEO">{t`Video`}</option>
                <option value="AUDIO">{t`Audio`}</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <Label htmlFor="cfStreamUid" className="text-xs">
                CF Stream UID
              </Label>
              <Input
                id="cfStreamUid"
                value={cfStreamUid}
                onChange={(e) => setCfStreamUid(e.target.value)}
                placeholder={t`volitelné`}
                disabled={createMediaMutation.isPending}
              />
            </div>
            <div className="w-24">
              <Label htmlFor="mediaSortOrder" className="text-xs">
                {t`Pořadí`}
              </Label>
              <Input
                id="mediaSortOrder"
                type="number"
                min="0"
                value={mediaSortOrder}
                onChange={(e) => setMediaSortOrder(e.target.value)}
                disabled={createMediaMutation.isPending}
              />
            </div>
          </div>
          <Button type="submit" size="sm" disabled={createMediaMutation.isPending}>
            {createMediaMutation.isPending ? t`Přidávám...` : t`Přidat médium`}
          </Button>
          {createMediaMutation.isError && (
            <p className="text-sm text-[var(--destructive)]">
              {t`Nepodařilo se přidat médium.`}
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}

// ---- Main Page ----

export function ProductEditPage() {
  const { _ } = useLingui();
  const params = useParams();
  const productId = params.productId as string;
  const router = useRouter();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManual, setSlugManual] = useState(false);
  const [description, setDescription] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [priceCZK, setPriceCZK] = useState("");
  const [priceEUR, setPriceEUR] = useState("");
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [formLoaded, setFormLoaded] = useState(false);

  const productQuery = useQuery({
    queryKey: ["admin", "product", productId],
    queryFn: () => adminApi.getProduct(productId),
    enabled: Boolean(productId),
  });

  const product = productQuery.data?.data;

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: () => catalogApi.getCategories(),
  });

  useEffect(() => {
    if (product && !formLoaded) {
      setTitle(product.title);
      setSlug(product.slug);
      setSlugManual(true);
      setDescription(product.description ?? "");
      setShortDescription(product.shortDescription ?? "");
      setPriceCZK(product.prices.CZK != null ? String(product.prices.CZK) : "");
      setPriceEUR(product.prices.EUR != null ? String(product.prices.EUR) : "");
      setCategoryIds(product.categories?.map((c) => c.id) ?? []);
      setMetaTitle(product.metaTitle ?? "");
      setMetaDescription(product.metaDescription ?? "");
      setFormLoaded(true);
    }
  }, [product, formLoaded]);

  const invalidateProduct = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["admin", "product", productId] });
    await queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
  }, [queryClient, productId]);

  const updateMutation = useMutation({
    mutationFn: (status: string) => {
      const prices: Record<string, number> = {};
      if (priceCZK) prices.CZK = Number(priceCZK);
      if (priceEUR) prices.EUR = Number(priceEUR);

      return adminApi.updateProduct(productId, {
        title,
        slug,
        description: description || undefined,
        shortDescription: shortDescription || undefined,
        productType: product!.productType,
        prices,
        categoryIds: categoryIds.length > 0 ? categoryIds : undefined,
        metaTitle: metaTitle || undefined,
        metaDescription: metaDescription || undefined,
        status,
      });
    },
    onSuccess: invalidateProduct,
  });

  function handleTitleChange(value: string) {
    setTitle(value);
    if (!slugManual) {
      setSlug(slugify(value));
    }
  }

  function handleSlugChange(value: string) {
    setSlugManual(true);
    setSlug(value);
  }

  function handleSaveAsDraft(event: React.FormEvent) {
    event.preventDefault();
    updateMutation.mutate("DRAFT");
  }

  function handlePublish() {
    updateMutation.mutate("ACTIVE");
  }

  const categories: CategoryResponse[] = categoriesQuery.data?.data ?? [];

  function toggleCategory(id: string) {
    setCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  }

  if (productQuery.isLoading) {
    return <p className="text-[var(--muted-foreground)]">{t`Načítání produktu...`}</p>;
  }

  if (productQuery.isError) {
    return (
      <p className="text-[var(--destructive)]">
        {t`Nepodařilo se načíst produkt. Zkuste to prosím znovu.`}
      </p>
    );
  }

  if (!product) {
    return <p className="text-[var(--muted-foreground)]">{t`Produkt nenalezen.`}</p>;
  }

  const isPending = updateMutation.isPending;

  const showVariantsTab = product.productType === "PHYSICAL";
  const showFilesTab = product.productType === "EBOOK";
  const showMediaTab = product.productType === "AUDIO_VIDEO";

  const typeLabel = PRODUCT_TYPES.find((pt) => pt.value === product.productType);
  const typeLabelStr = typeLabel ? _(typeLabel.label) : product.productType;

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-2xl font-bold">{t`Upravit produkt`}</h2>
        <p className="text-sm text-[var(--muted-foreground)]">{typeLabelStr}</p>
      </div>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">{t`Základní info`}</TabsTrigger>
          <TabsTrigger value="gallery">{t`Galerie`}</TabsTrigger>
          {showVariantsTab && <TabsTrigger value="variants">{t`Varianty`}</TabsTrigger>}
          {showFilesTab && <TabsTrigger value="files">{t`Soubory`}</TabsTrigger>}
          {showMediaTab && <TabsTrigger value="media">{t`Média`}</TabsTrigger>}
          <TabsTrigger value="seo">SEO</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <Card>
            <CardHeader>
              <CardTitle>{t`Údaje o produktu`}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveAsDraft} className="space-y-4">
                <div>
                  <Label htmlFor="title">{t`Název`}</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    required
                    disabled={isPending}
                  />
                </div>

                <div>
                  <Label htmlFor="slug">{t`Slug`}</Label>
                  <Input
                    id="slug"
                    value={slug}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    required
                    disabled={isPending}
                  />
                </div>

                <div>
                  <Label htmlFor="description">{t`Popis`}</Label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={isPending}
                    rows={4}
                    className={textareaClassName}
                  />
                </div>

                <div>
                  <Label htmlFor="shortDescription">{t`Krátký popis`}</Label>
                  <Input
                    id="shortDescription"
                    value={shortDescription}
                    onChange={(e) => setShortDescription(e.target.value)}
                    disabled={isPending}
                  />
                </div>

                <div>
                  <Label>{t`Ceny`}</Label>
                  <div className="mt-1 flex gap-4">
                    <div className="flex-1">
                      <Label htmlFor="priceCZK" className="text-xs text-[var(--muted-foreground)]">
                        CZK
                      </Label>
                      <Input
                        id="priceCZK"
                        type="number"
                        min="0"
                        step="0.01"
                        value={priceCZK}
                        onChange={(e) => setPriceCZK(e.target.value)}
                        placeholder="0.00"
                        disabled={isPending}
                      />
                    </div>
                    <div className="flex-1">
                      <Label htmlFor="priceEUR" className="text-xs text-[var(--muted-foreground)]">
                        EUR
                      </Label>
                      <Input
                        id="priceEUR"
                        type="number"
                        min="0"
                        step="0.01"
                        value={priceEUR}
                        onChange={(e) => setPriceEUR(e.target.value)}
                        placeholder="0.00"
                        disabled={isPending}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <Label>{t`Kategorie`}</Label>
                  <div className="mt-1 max-h-48 space-y-2 overflow-y-auto rounded-md border border-[var(--border)] p-3">
                    {categories.length === 0 ? (
                      <p className="text-sm text-[var(--muted-foreground)]">{t`Žádné kategorie`}</p>
                    ) : (
                      categories.map((cat) => (
                        <label key={cat.id} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={categoryIds.includes(cat.id)}
                            onChange={() => toggleCategory(cat.id)}
                            disabled={isPending}
                          />
                          {cat.name}
                        </label>
                      ))
                    )}
                  </div>
                </div>

                {updateMutation.isError && (
                  <p className="text-sm text-[var(--destructive)]">
                    {t`Nepodařilo se uložit změny. Zkuste to prosím znovu.`}
                  </p>
                )}

                {updateMutation.isSuccess && (
                  <p className="text-sm text-green-600">{t`Produkt byl úspěšně uložen.`}</p>
                )}

                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={handlePublish}
                    disabled={isPending}
                  >
                    {isPending ? t`Ukládám...` : t`Publikovat`}
                  </Button>
                  <Button type="submit" variant="outline" disabled={isPending}>
                    {t`Uložit jako draft`}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push("/admin/produkty")}
                    disabled={isPending}
                  >
                    {t`Zpět na produkty`}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gallery">
          <GalleryTab
            productId={productId}
            images={product.images ?? []}
            onInvalidate={invalidateProduct}
          />
        </TabsContent>

        {showVariantsTab && (
          <TabsContent value="variants">
            <VariantsTab
              productId={productId}
              variants={product.variants ?? []}
              onInvalidate={invalidateProduct}
            />
          </TabsContent>
        )}

        {showFilesTab && (
          <TabsContent value="files">
            <FilesTab
              productId={productId}
              files={product.files ?? []}
              onInvalidate={invalidateProduct}
            />
          </TabsContent>
        )}

        {showMediaTab && (
          <TabsContent value="media">
            <MediaTab
              productId={productId}
              mediaItems={product.media ?? []}
              onInvalidate={invalidateProduct}
            />
          </TabsContent>
        )}

        <TabsContent value="seo">
          <Card>
            <CardHeader>
              <CardTitle>SEO</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="metaTitle">{t`Meta titulek`}</Label>
                <Input
                  id="metaTitle"
                  value={metaTitle}
                  onChange={(e) => setMetaTitle(e.target.value)}
                  disabled={isPending}
                  maxLength={255}
                />
              </div>
              <div>
                <Label htmlFor="metaDescription">{t`Meta popis`}</Label>
                <textarea
                  id="metaDescription"
                  value={metaDescription}
                  onChange={(e) => setMetaDescription(e.target.value)}
                  disabled={isPending}
                  rows={3}
                  maxLength={500}
                  className={textareaClassName}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
