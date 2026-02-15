import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "@tanstack/react-router";
import { adminApi, catalogApi } from "@samofujera/api-client";
import type {
  ProductType,
  FileResponse,
  MediaResponse,
  ImageResponse,
  VariantResponse,
  CreateVariantRequest,
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

function flattenCategories(
  cats: Array<{ id: string; name: string; children: Array<{ id: string; name: string; children: unknown[] }> }>,
  depth = 0,
): Array<{ id: string; name: string; depth: number }> {
  const result: Array<{ id: string; name: string; depth: number }> = [];
  for (const cat of cats) {
    result.push({ id: cat.id, name: cat.name, depth });
    if (cat.children?.length) {
      result.push(
        ...flattenCategories(
          cat.children as Array<{ id: string; name: string; children: Array<{ id: string; name: string; children: unknown[] }> }>,
          depth + 1,
        ),
      );
    }
  }
  return result;
}

const PRODUCT_TYPES: Array<{ value: ProductType; label: string }> = [
  { value: "PHYSICAL", label: "Fyzický produkt" },
  { value: "EBOOK", label: "E-book" },
  { value: "AUDIO_VIDEO", label: "Audio/Video" },
  { value: "ONLINE_EVENT", label: "Online událost" },
  { value: "RECURRING_EVENT", label: "Opakovaná událost" },
  { value: "OFFLINE_EVENT", label: "Offline událost" },
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

  const uploadImageMutation = useMutation({
    mutationFn: (file: File) => adminApi.uploadImage(productId, file),
    onSuccess: async () => {
      await onInvalidate();
      if (imageInputRef.current) imageInputRef.current.value = "";
    },
  });

  const deleteImageMutation = useMutation({
    mutationFn: (imageId: string) => adminApi.deleteImage(productId, imageId),
    onSuccess: onInvalidate,
  });

  const reorderMutation = useMutation({
    mutationFn: (imageIds: string[]) => adminApi.reorderImages(productId, imageIds),
    onSuccess: onInvalidate,
  });

  const updateAltTextMutation = useMutation({
    mutationFn: ({ imageId, altText }: { imageId: string; altText: string }) =>
      adminApi.updateImageAltText(productId, imageId, altText),
    onSuccess: onInvalidate,
  });

  function handleUploadImage() {
    const file = imageInputRef.current?.files?.[0];
    if (file) uploadImageMutation.mutate(file);
  }

  function handleDeleteImage(image: ImageResponse) {
    if (window.confirm(`Opravdu chcete smazat obrázek "${image.fileName}"?`)) {
      deleteImageMutation.mutate(image.id);
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
    reorderMutation.mutate(newOrder.map((img) => img.id));
    setDragOverIndex(null);
    setDragSourceIndex(null);
  }

  function handleAltTextBlur(image: ImageResponse, newAltText: string) {
    if (newAltText !== (image.altText ?? "")) {
      updateAltTextMutation.mutate({ imageId: image.id, altText: newAltText });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Galerie obrázků</CardTitle>
      </CardHeader>
      <CardContent>
        {images.length > 0 ? (
          <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {images.map((image, index) => (
              <div
                key={image.id}
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
                  src={image.url}
                  alt={image.altText ?? image.fileName}
                  className="aspect-square w-full rounded object-cover"
                />
                <div className="mt-1.5 space-y-1">
                  <p className="truncate text-xs text-[var(--muted-foreground)]">
                    {image.fileName}
                  </p>
                  <input
                    type="text"
                    defaultValue={image.altText ?? ""}
                    placeholder="Alt text..."
                    onBlur={(e) => handleAltTextBlur(image, e.target.value)}
                    className="w-full rounded border border-[var(--border)] bg-transparent px-1.5 py-0.5 text-xs"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteImage(image)}
                  disabled={deleteImageMutation.isPending}
                  className="absolute right-1 top-1 hidden rounded bg-[var(--destructive)] px-1.5 py-0.5 text-xs text-[var(--destructive-foreground)] group-hover:block"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="mb-4 text-sm text-[var(--muted-foreground)]">
            Žádné nahrané obrázky.
          </p>
        )}

        <div className="flex items-end gap-3">
          <div className="flex-1">
            <Label htmlFor="imageUpload">Nahrát obrázek</Label>
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
            disabled={uploadImageMutation.isPending}
          >
            {uploadImageMutation.isPending ? "Nahrávám..." : "Nahrát"}
          </Button>
        </div>

        {uploadImageMutation.isError && (
          <p className="mt-2 text-sm text-[var(--destructive)]">
            Nepodařilo se nahrát obrázek. Zkuste to prosím znovu.
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
      if (window.confirm(`Opravdu chcete smazat variantu "${row.name}"?`)) {
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
        <CardTitle>Varianty</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--muted-foreground)]">
                  <th className="px-2 py-2">Název</th>
                  <th className="px-2 py-2">SKU</th>
                  <th className="px-2 py-2 w-20">Sklad</th>
                  <th className="px-2 py-2 w-24">CZK</th>
                  <th className="px-2 py-2 w-24">EUR</th>
                  <th className="px-2 py-2 w-32">Akce</th>
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
                            Uložit
                          </Button>
                        )}
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteRow(index)}
                          disabled={isPending}
                          className="h-8"
                        >
                          Smazat
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
            Žádné varianty. Přidejte první variantu níže.
          </p>
        )}

        <Button type="button" variant="outline" onClick={addRow} disabled={isPending} className="mt-4">
          Přidat variantu
        </Button>

        {(createVariantMutation.isError || updateVariantMutation.isError || deleteVariantMutation.isError) && (
          <p className="mt-2 text-sm text-[var(--destructive)]">
            Operace se nezdařila. Zkuste to prosím znovu.
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
    if (window.confirm(`Opravdu chcete smazat soubor "${file.fileName}"?`)) {
      deleteFileMutation.mutate(file.id);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Soubory ke stažení</CardTitle>
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
                  Smazat
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="mb-4 text-sm text-[var(--muted-foreground)]">
            Žádné nahrané soubory.
          </p>
        )}

        <div className="flex items-end gap-3">
          <div className="flex-1">
            <Label htmlFor="fileUpload">Nahrát soubor</Label>
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
            {uploadFileMutation.isPending ? "Nahrávám..." : "Nahrát"}
          </Button>
        </div>

        {uploadFileMutation.isError && (
          <p className="mt-2 text-sm text-[var(--destructive)]">
            Nepodařilo se nahrát soubor. Zkuste to prosím znovu.
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
    if (window.confirm(`Opravdu chcete smazat "${media.title}"?`)) {
      deleteMediaMutation.mutate(media.id);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Média</CardTitle>
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
                  Smazat
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="mb-4 text-sm text-[var(--muted-foreground)]">
            Žádná přidaná média.
          </p>
        )}

        <form onSubmit={handleCreateMedia} className="space-y-3 rounded-md border border-[var(--border)] p-4">
          <p className="text-sm font-medium">Přidat médium</p>
          <div className="flex gap-3">
            <div className="flex-1">
              <Label htmlFor="mediaTitle" className="text-xs">
                Název
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
                Typ
              </Label>
              <select
                id="mediaType"
                value={mediaType}
                onChange={(e) => setMediaType(e.target.value as "VIDEO" | "AUDIO")}
                disabled={createMediaMutation.isPending}
                className={selectClassName}
              >
                <option value="VIDEO">Video</option>
                <option value="AUDIO">Audio</option>
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
                placeholder="volitelné"
                disabled={createMediaMutation.isPending}
              />
            </div>
            <div className="w-24">
              <Label htmlFor="mediaSortOrder" className="text-xs">
                Pořadí
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
            {createMediaMutation.isPending ? "Přidávám..." : "Přidat médium"}
          </Button>
          {createMediaMutation.isError && (
            <p className="text-sm text-[var(--destructive)]">
              Nepodařilo se přidat médium.
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}

// ---- Main Page ----

export function ProductEditPage() {
  const { productId } = useParams({ strict: false }) as { productId: string };
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManual, setSlugManual] = useState(false);
  const [description, setDescription] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [productType, setProductType] = useState<ProductType>("EBOOK");
  const [priceCZK, setPriceCZK] = useState("");
  const [priceEUR, setPriceEUR] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [status, setStatus] = useState("DRAFT");
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
      setProductType(product.productType);
      setPriceCZK(product.prices.CZK != null ? String(product.prices.CZK) : "");
      setPriceEUR(product.prices.EUR != null ? String(product.prices.EUR) : "");
      setCategoryId(product.categoryId ?? "");
      setStatus(product.status);
      setFormLoaded(true);
    }
  }, [product, formLoaded]);

  const invalidateProduct = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["admin", "product", productId] });
    await queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
  }, [queryClient, productId]);

  const updateMutation = useMutation({
    mutationFn: () => {
      const prices: Record<string, number> = {};
      if (priceCZK) prices.CZK = Number(priceCZK);
      if (priceEUR) prices.EUR = Number(priceEUR);

      return adminApi.updateProduct(productId, {
        title,
        slug,
        description: description || undefined,
        shortDescription: shortDescription || undefined,
        productType,
        prices,
        categoryId: categoryId || undefined,
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

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    updateMutation.mutate();
  }

  const flatCategories = categoriesQuery.data?.data
    ? flattenCategories(categoriesQuery.data.data)
    : [];

  if (productQuery.isLoading) {
    return <p className="text-[var(--muted-foreground)]">Načítání produktu...</p>;
  }

  if (productQuery.isError) {
    return (
      <p className="text-[var(--destructive)]">
        Nepodařilo se načíst produkt. Zkuste to prosím znovu.
      </p>
    );
  }

  if (!product) {
    return <p className="text-[var(--muted-foreground)]">Produkt nenalezen.</p>;
  }

  const isPending = updateMutation.isPending;

  const showVariantsTab = product.productType === "PHYSICAL";
  const showFilesTab = product.productType === "EBOOK";
  const showMediaTab = product.productType === "AUDIO_VIDEO";

  return (
    <div>
      <h2 className="mb-4 text-2xl font-bold">Upravit produkt</h2>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Základní info</TabsTrigger>
          <TabsTrigger value="gallery">Galerie</TabsTrigger>
          {showVariantsTab && <TabsTrigger value="variants">Varianty</TabsTrigger>}
          {showFilesTab && <TabsTrigger value="files">Soubory</TabsTrigger>}
          {showMediaTab && <TabsTrigger value="media">Média</TabsTrigger>}
        </TabsList>

        <TabsContent value="info">
          <Card>
            <CardHeader>
              <CardTitle>Údaje o produktu</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="title">Název</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    required
                    disabled={isPending}
                  />
                </div>

                <div>
                  <Label htmlFor="slug">Slug</Label>
                  <Input
                    id="slug"
                    value={slug}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    required
                    disabled={isPending}
                  />
                </div>

                <div>
                  <Label htmlFor="description">Popis</Label>
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
                  <Label htmlFor="shortDescription">Krátký popis</Label>
                  <Input
                    id="shortDescription"
                    value={shortDescription}
                    onChange={(e) => setShortDescription(e.target.value)}
                    disabled={isPending}
                  />
                </div>

                <div>
                  <Label htmlFor="productType">Typ produktu</Label>
                  <select
                    id="productType"
                    value={productType}
                    onChange={(e) => setProductType(e.target.value as ProductType)}
                    disabled={isPending}
                    className={selectClassName}
                  >
                    {PRODUCT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="status">Stav</Label>
                  <select
                    id="status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    disabled={isPending}
                    className={selectClassName}
                  >
                    <option value="DRAFT">Koncept</option>
                    <option value="ACTIVE">Aktivní</option>
                    <option value="ARCHIVED">Archivováno</option>
                  </select>
                </div>

                <div>
                  <Label>Ceny</Label>
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
                  <Label htmlFor="categoryId">Kategorie</Label>
                  <select
                    id="categoryId"
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    disabled={isPending}
                    className={selectClassName}
                  >
                    <option value="">-- Bez kategorie --</option>
                    {flatCategories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {"  ".repeat(cat.depth)}{cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                {updateMutation.isError && (
                  <p className="text-sm text-[var(--destructive)]">
                    Nepodařilo se uložit změny. Zkuste to prosím znovu.
                  </p>
                )}

                {updateMutation.isSuccess && (
                  <p className="text-sm text-green-600">Produkt byl úspěšně uložen.</p>
                )}

                <div className="flex gap-2">
                  <Button type="submit" disabled={isPending}>
                    {isPending ? "Ukládání..." : "Uložit změny"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void navigate({ to: "/produkty" })}
                    disabled={isPending}
                  >
                    Zpět na produkty
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
      </Tabs>
    </div>
  );
}
