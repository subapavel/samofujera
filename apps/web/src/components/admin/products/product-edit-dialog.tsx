"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { t } from "@lingui/core/macro";
import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import type { MessageDescriptor } from "@lingui/core";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Textarea,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Checkbox,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@samofujera/ui";
import { MediaPicker } from "../media/MediaPicker";
import { formatFileSize } from "../media/format-file-size";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const PRODUCT_TYPES: Array<{ value: ProductType; label: MessageDescriptor }> = [
  { value: "PHYSICAL", label: msg`Fyzický produkt` },
  { value: "EBOOK", label: msg`E-book` },
  { value: "AUDIO_VIDEO", label: msg`Audio/Video` },
  { value: "ONLINE_EVENT", label: msg`Online událost` },
  { value: "RECURRING_EVENT", label: msg`Opakovaná událost` },
  { value: "OFFLINE_EVENT", label: msg`Offline událost` },
];

const productFormSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional().default(""),
  shortDescription: z.string().optional().default(""),
  priceCZK: z.string().optional().default(""),
  priceEUR: z.string().optional().default(""),
  categoryIds: z.array(z.string()).default([]),
  metaTitle: z.string().optional().default(""),
  metaDescription: z.string().optional().default(""),
});

type ProductFormValues = z.infer<typeof productFormSchema>;

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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t`Název`}</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead className="w-20">{t`Sklad`}</TableHead>
                  <TableHead className="w-24">CZK</TableHead>
                  <TableHead className="w-24">EUR</TableHead>
                  <TableHead className="w-32">{t`Akce`}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, index) => (
                  <TableRow key={row.id ?? `new-${index}`}>
                    <TableCell className="px-2 py-1.5">
                      <Input
                        value={row.name}
                        onChange={(e) => updateRow(index, "name", e.target.value)}
                        disabled={isPending}
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell className="px-2 py-1.5">
                      <Input
                        value={row.sku}
                        onChange={(e) => updateRow(index, "sku", e.target.value)}
                        disabled={isPending}
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell className="px-2 py-1.5">
                      <Input
                        type="number"
                        min="0"
                        value={row.stock}
                        onChange={(e) => updateRow(index, "stock", e.target.value)}
                        disabled={isPending}
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell className="px-2 py-1.5">
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
                    </TableCell>
                    <TableCell className="px-2 py-1.5">
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
                    </TableCell>
                    <TableCell className="px-2 py-1.5">
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
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
              <Select
                value={mediaType}
                onValueChange={(value) => setMediaType(value as "VIDEO" | "AUDIO")}
                disabled={createMediaMutation.isPending}
              >
                <SelectTrigger id="mediaType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VIDEO">{t`Video`}</SelectItem>
                  <SelectItem value="AUDIO">{t`Audio`}</SelectItem>
                </SelectContent>
              </Select>
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

// ---- Dialog ----

interface ProductEditDialogProps {
  productId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProductEditDialog({ productId, open, onOpenChange }: ProductEditDialogProps) {
  const { _ } = useLingui();
  const queryClient = useQueryClient();

  const [slugManual, setSlugManual] = useState(false);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      title: "",
      slug: "",
      description: "",
      shortDescription: "",
      priceCZK: "",
      priceEUR: "",
      categoryIds: [],
      metaTitle: "",
      metaDescription: "",
    },
  });

  const productQuery = useQuery({
    queryKey: ["admin", "product", productId],
    queryFn: () => adminApi.getProduct(productId!),
    enabled: Boolean(productId) && open,
  });

  const product = productQuery.data?.data;

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: () => catalogApi.getCategories(),
  });

  useEffect(() => {
    if (product) {
      form.reset({
        title: product.title,
        slug: product.slug,
        description: product.description ?? "",
        shortDescription: product.shortDescription ?? "",
        priceCZK: product.prices.CZK != null ? String(product.prices.CZK) : "",
        priceEUR: product.prices.EUR != null ? String(product.prices.EUR) : "",
        categoryIds: product.categories?.map((c) => c.id) ?? [],
        metaTitle: product.metaTitle ?? "",
        metaDescription: product.metaDescription ?? "",
      });
      setSlugManual(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id]);

  const watchedTitle = form.watch("title");

  useEffect(() => {
    if (!slugManual && watchedTitle) {
      form.setValue("slug", slugify(watchedTitle), { shouldDirty: true });
    }
  }, [watchedTitle, slugManual, form]);

  const invalidateProduct = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["admin", "product", productId] });
    await queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
  }, [queryClient, productId]);

  const updateMutation = useMutation({
    mutationFn: (status: string) => {
      const values = form.getValues();
      const prices: Record<string, number> = {};
      if (values.priceCZK) prices.CZK = Number(values.priceCZK);
      if (values.priceEUR) prices.EUR = Number(values.priceEUR);

      return adminApi.updateProduct(productId!, {
        title: values.title,
        slug: values.slug,
        description: values.description || undefined,
        shortDescription: values.shortDescription || undefined,
        productType: product!.productType,
        prices,
        categoryIds: (values.categoryIds ?? []).length > 0 ? values.categoryIds : undefined,
        metaTitle: values.metaTitle || undefined,
        metaDescription: values.metaDescription || undefined,
        status,
      });
    },
    onSuccess: invalidateProduct,
  });

  function handleSaveAsDraft() {
    updateMutation.mutate("DRAFT");
  }

  function handlePublish() {
    updateMutation.mutate("ACTIVE");
  }

  const categories: CategoryResponse[] = categoriesQuery.data?.data ?? [];

  function toggleCategory(id: string) {
    const current = form.getValues("categoryIds") ?? [];
    const next = current.includes(id)
      ? current.filter((c) => c !== id)
      : [...current, id];
    form.setValue("categoryIds", next, { shouldDirty: true });
  }

  const isPending = updateMutation.isPending;

  const showVariantsTab = product?.productType === "PHYSICAL";
  const showFilesTab = product?.productType === "EBOOK";
  const showMediaTab = product?.productType === "AUDIO_VIDEO";

  const typeLabel = product
    ? PRODUCT_TYPES.find((pt) => pt.value === product.productType)
    : undefined;
  const typeLabelStr = typeLabel ? _(typeLabel.label) : (product?.productType ?? "");

  const categoryIds = form.watch("categoryIds") ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t`Upravit produkt`}</DialogTitle>
          <DialogDescription>{typeLabelStr}</DialogDescription>
        </DialogHeader>

        {productQuery.isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : productQuery.isError ? (
          <div className="text-center text-sm text-destructive">
            {t`Nepodařilo se načíst produkt.`}
          </div>
        ) : !product ? null : (
          <Tabs defaultValue="info" className="w-full">
            <TabsList>
              <TabsTrigger value="info">{t`Základní info`}</TabsTrigger>
              <TabsTrigger value="gallery">{t`Galerie`}</TabsTrigger>
              {showVariantsTab && <TabsTrigger value="variants">{t`Varianty`}</TabsTrigger>}
              {showFilesTab && <TabsTrigger value="files">{t`Soubory`}</TabsTrigger>}
              {showMediaTab && <TabsTrigger value="media">{t`Média`}</TabsTrigger>}
              <TabsTrigger value="seo">SEO</TabsTrigger>
            </TabsList>

            <TabsContent value="info">
              <Form {...form}>
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t`Název`}</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            required
                            disabled={isPending}
                            onChange={(e) => {
                              field.onChange(e);
                              if (!slugManual) {
                                form.setValue("slug", slugify(e.target.value), { shouldDirty: true });
                              }
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="slug"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t`Slug`}</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            required
                            disabled={isPending}
                            onChange={(e) => {
                              setSlugManual(true);
                              field.onChange(e);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t`Popis`}</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            disabled={isPending}
                            rows={4}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="shortDescription"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t`Krátký popis`}</FormLabel>
                        <FormControl>
                          <Input {...field} disabled={isPending} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div>
                    <Label>{t`Ceny`}</Label>
                    <div className="mt-1 flex gap-4">
                      <FormField
                        control={form.control}
                        name="priceCZK"
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormLabel className="text-xs text-[var(--muted-foreground)]">
                              CZK
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                disabled={isPending}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="priceEUR"
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormLabel className="text-xs text-[var(--muted-foreground)]">
                              EUR
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                disabled={isPending}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
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
                            <Checkbox
                              checked={categoryIds.includes(cat.id)}
                              onCheckedChange={() => toggleCategory(cat.id)}
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
                </div>
              </Form>
            </TabsContent>

            <TabsContent value="gallery">
              <GalleryTab
                productId={productId!}
                images={product.images ?? []}
                onInvalidate={invalidateProduct}
              />
            </TabsContent>

            {showVariantsTab && (
              <TabsContent value="variants">
                <VariantsTab
                  productId={productId!}
                  variants={product.variants ?? []}
                  onInvalidate={invalidateProduct}
                />
              </TabsContent>
            )}

            {showFilesTab && (
              <TabsContent value="files">
                <FilesTab
                  productId={productId!}
                  files={product.files ?? []}
                  onInvalidate={invalidateProduct}
                />
              </TabsContent>
            )}

            {showMediaTab && (
              <TabsContent value="media">
                <MediaTab
                  productId={productId!}
                  mediaItems={product.media ?? []}
                  onInvalidate={invalidateProduct}
                />
              </TabsContent>
            )}

            <TabsContent value="seo">
              <Form {...form}>
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="metaTitle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t`Meta titulek`}</FormLabel>
                        <FormControl>
                          <Input {...field} disabled={isPending} maxLength={255} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="metaDescription"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t`Meta popis`}</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            disabled={isPending}
                            rows={3}
                            maxLength={500}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </Form>
            </TabsContent>
          </Tabs>
        )}

        {product && (
          <div className="flex justify-end gap-2 border-t pt-4">
            <Button type="button" onClick={handlePublish} disabled={isPending}>
              {isPending ? t`Ukládám...` : t`Publikovat`}
            </Button>
            <Button type="button" variant="outline" onClick={handleSaveAsDraft} disabled={isPending}>
              {t`Uložit jako draft`}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
