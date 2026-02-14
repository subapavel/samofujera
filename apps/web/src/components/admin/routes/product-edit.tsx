import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "@tanstack/react-router";
import { adminApi } from "@samofujera/api-client";
import type { AssetResponse } from "@samofujera/api-client";
import { Button, Input, Label, Card, CardContent, CardHeader, CardTitle } from "@samofujera/ui";

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

export function ProductEditPage() {
  const { productId } = useParams({ strict: false }) as { productId: string };
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManual, setSlugManual] = useState(false);
  const [description, setDescription] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [productType, setProductType] = useState("DIGITAL");
  const [priceAmount, setPriceAmount] = useState("");
  const [priceCurrency, setPriceCurrency] = useState("CZK");
  const [categoryId, setCategoryId] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
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

  // Load form when product data arrives
  useEffect(() => {
    if (product && !formLoaded) {
      setTitle(product.title);
      setSlug(product.slug);
      setSlugManual(true);
      setDescription(product.description ?? "");
      setShortDescription(product.shortDescription ?? "");
      setProductType(product.productType);
      setPriceAmount(String(product.priceAmount));
      setPriceCurrency(product.priceCurrency);
      setCategoryId(product.categoryId ?? "");
      setThumbnailUrl(product.thumbnailUrl ?? "");
      setStatus(product.status);
      setFormLoaded(true);
    }
  }, [product, formLoaded]);

  const updateMutation = useMutation({
    mutationFn: () =>
      adminApi.updateProduct(productId, {
        title,
        slug,
        description: description || undefined,
        shortDescription: shortDescription || undefined,
        productType,
        priceAmount: Number(priceAmount),
        priceCurrency: priceCurrency || undefined,
        categoryId: categoryId || undefined,
        thumbnailUrl: thumbnailUrl || undefined,
        status,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "product", productId] });
      await queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => adminApi.uploadAsset(productId, file),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "product", productId] });
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
  });

  const deleteAssetMutation = useMutation({
    mutationFn: (assetId: string) => adminApi.deleteAsset(productId, assetId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "product", productId] });
    },
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

  function handleUpload() {
    const file = fileInputRef.current?.files?.[0];
    if (file) {
      uploadMutation.mutate(file);
    }
  }

  function handleDeleteAsset(asset: AssetResponse) {
    if (window.confirm(`Opravdu chcete smazat soubor "${asset.fileName}"?`)) {
      deleteAssetMutation.mutate(asset.id);
    }
  }

  const flatCategories = categoriesQuery.data?.data
    ? flattenCategories(categoriesQuery.data.data)
    : [];

  const assets = product?.assets ?? [];

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

  return (
    <div>
      <h2 className="mb-4 text-2xl font-bold">Upravit produkt</h2>

      <Card className="mb-6">
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
                disabled={updateMutation.isPending}
              />
            </div>

            <div>
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                required
                disabled={updateMutation.isPending}
              />
            </div>

            <div>
              <Label htmlFor="description">Popis</Label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={updateMutation.isPending}
                rows={4}
                className="flex w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm ring-offset-[var(--background)] placeholder:text-[var(--muted-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
              />
            </div>

            <div>
              <Label htmlFor="shortDescription">Krátký popis</Label>
              <Input
                id="shortDescription"
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
                disabled={updateMutation.isPending}
              />
            </div>

            <div>
              <Label htmlFor="productType">Typ produktu</Label>
              <select
                id="productType"
                value={productType}
                onChange={(e) => setProductType(e.target.value)}
                disabled={updateMutation.isPending}
                className="flex w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
              >
                <option value="DIGITAL">Digitální</option>
                <option value="STREAMING">Streaming</option>
                <option value="PHYSICAL">Fyzický</option>
                <option value="EVENT">Událost</option>
              </select>
            </div>

            <div>
              <Label htmlFor="status">Stav</Label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                disabled={updateMutation.isPending}
                className="flex w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
              >
                <option value="DRAFT">Koncept</option>
                <option value="ACTIVE">Aktivní</option>
                <option value="ARCHIVED">Archivováno</option>
              </select>
            </div>

            <div className="flex gap-4">
              <div className="flex-1">
                <Label htmlFor="priceAmount">Cena</Label>
                <Input
                  id="priceAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={priceAmount}
                  onChange={(e) => setPriceAmount(e.target.value)}
                  required
                  disabled={updateMutation.isPending}
                />
              </div>
              <div className="w-32">
                <Label htmlFor="priceCurrency">Měna</Label>
                <select
                  id="priceCurrency"
                  value={priceCurrency}
                  onChange={(e) => setPriceCurrency(e.target.value)}
                  disabled={updateMutation.isPending}
                  className="flex w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
                >
                  <option value="CZK">CZK</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
            </div>

            <div>
              <Label htmlFor="categoryId">Kategorie</Label>
              <select
                id="categoryId"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                disabled={updateMutation.isPending}
                className="flex w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
              >
                <option value="">-- Bez kategorie --</option>
                {flatCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {"  ".repeat(cat.depth)}{cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="thumbnailUrl">URL náhledu</Label>
              <Input
                id="thumbnailUrl"
                value={thumbnailUrl}
                onChange={(e) => setThumbnailUrl(e.target.value)}
                placeholder="https://..."
                disabled={updateMutation.isPending}
              />
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
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Ukládání..." : "Uložit změny"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => void navigate({ to: "/produkty" })}
                disabled={updateMutation.isPending}
              >
                Zpět na produkty
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Asset Management */}
      <Card>
        <CardHeader>
          <CardTitle>Soubory (Assets)</CardTitle>
        </CardHeader>
        <CardContent>
          {assets.length > 0 ? (
            <div className="mb-4 space-y-2">
              {assets.map((asset) => (
                <div
                  key={asset.id}
                  className="flex items-center justify-between rounded-md border border-[var(--border)] p-3"
                >
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">{asset.fileName}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {asset.assetType} &middot; {formatFileSize(asset.fileSizeBytes)}
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={deleteAssetMutation.isPending}
                    onClick={() => handleDeleteAsset(asset)}
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
              <Label htmlFor="assetFile">Nahrát soubor</Label>
              <input
                ref={fileInputRef}
                id="assetFile"
                type="file"
                className="block w-full text-sm text-[var(--muted-foreground)] file:mr-2 file:rounded-md file:border-0 file:bg-[var(--primary)] file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-[var(--primary-foreground)]"
              />
            </div>
            <Button
              type="button"
              onClick={handleUpload}
              disabled={uploadMutation.isPending}
            >
              {uploadMutation.isPending ? "Nahrávám..." : "Nahrát"}
            </Button>
          </div>

          {uploadMutation.isError && (
            <p className="mt-2 text-sm text-[var(--destructive)]">
              Nepodařilo se nahrát soubor. Zkuste to prosím znovu.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
