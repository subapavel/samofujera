import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { adminApi, catalogApi } from "@samofujera/api-client";
import { Button, Input, Label, Card, CardContent, CardHeader, CardTitle } from "@samofujera/ui";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function ProductNewPage() {
  const navigate = useNavigate();

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

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: () => catalogApi.getCategories(),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      adminApi.createProduct({
        title,
        slug,
        description: description || undefined,
        shortDescription: shortDescription || undefined,
        productType,
        priceAmount: Number(priceAmount),
        priceCurrency: priceCurrency || undefined,
        categoryId: categoryId || undefined,
        thumbnailUrl: thumbnailUrl || undefined,
      }),
    onSuccess: (response) => {
      void navigate({ to: `/produkty/${response.data.id}` });
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
    createMutation.mutate();
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

  const flatCategories = categoriesQuery.data?.data
    ? flattenCategories(categoriesQuery.data.data)
    : [];

  return (
    <div>
      <h2 className="mb-4 text-2xl font-bold">Nový produkt</h2>

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
                disabled={createMutation.isPending}
              />
            </div>

            <div>
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                required
                disabled={createMutation.isPending}
              />
            </div>

            <div>
              <Label htmlFor="description">Popis</Label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={createMutation.isPending}
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
                disabled={createMutation.isPending}
              />
            </div>

            <div>
              <Label htmlFor="productType">Typ produktu</Label>
              <select
                id="productType"
                value={productType}
                onChange={(e) => setProductType(e.target.value)}
                disabled={createMutation.isPending}
                className="flex w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
              >
                <option value="DIGITAL">Digitální</option>
                <option value="STREAMING">Streaming</option>
                <option value="PHYSICAL">Fyzický</option>
                <option value="EVENT">Událost</option>
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
                  disabled={createMutation.isPending}
                />
              </div>
              <div className="w-32">
                <Label htmlFor="priceCurrency">Měna</Label>
                <select
                  id="priceCurrency"
                  value={priceCurrency}
                  onChange={(e) => setPriceCurrency(e.target.value)}
                  disabled={createMutation.isPending}
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
                disabled={createMutation.isPending}
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
                disabled={createMutation.isPending}
              />
            </div>

            {createMutation.isError && (
              <p className="text-sm text-[var(--destructive)]">
                Nepodařilo se vytvořit produkt. Zkuste to prosím znovu.
              </p>
            )}

            <div className="flex gap-2">
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Vytvářím..." : "Vytvořit produkt"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => void navigate({ to: "/produkty" })}
                disabled={createMutation.isPending}
              >
                Zrušit
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
