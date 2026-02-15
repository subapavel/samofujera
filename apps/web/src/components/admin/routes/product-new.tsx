import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { adminApi, catalogApi } from "@samofujera/api-client";
import type { ProductType, CategoryResponse } from "@samofujera/api-client";
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

const PRODUCT_TYPES: Array<{ value: ProductType; label: string; description: string }> = [
  { value: "PHYSICAL", label: "Fyzický produkt", description: "Hmotný produkt s variantami a skladem" },
  { value: "EBOOK", label: "E-book", description: "Digitální soubory ke stažení" },
  { value: "AUDIO_VIDEO", label: "Audio/Video", description: "Streamovaný obsah přes Cloudflare" },
  { value: "ONLINE_EVENT", label: "Online událost", description: "Jednorázová online událost" },
  { value: "RECURRING_EVENT", label: "Opakovaná událost", description: "Pravidelně se opakující událost" },
  { value: "OFFLINE_EVENT", label: "Offline událost", description: "Prezenční událost na místě" },
];

const textareaClassName =
  "flex w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm ring-offset-[var(--background)] placeholder:text-[var(--muted-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2";

function SaveFirstPlaceholder({ label }: { label: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-[var(--muted-foreground)]">
          Nejdřív uložte produkt, pak budete moci spravovat {label.toLowerCase()}.
        </p>
      </CardContent>
    </Card>
  );
}

// ---- Type Selection Step ----

function TypeSelectionStep() {
  const navigate = useNavigate();

  return (
    <div>
      <h2 className="mb-4 text-2xl font-bold">Nový produkt</h2>
      <p className="mb-6 text-[var(--muted-foreground)]">Vyberte typ produktu</p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PRODUCT_TYPES.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => void navigate({ to: "/produkty/novy", search: { typ: t.value } })}
            className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-5 text-left transition-colors hover:border-[var(--ring)] hover:bg-[var(--accent)]"
          >
            <p className="text-sm font-medium">{t.label}</p>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">{t.description}</p>
          </button>
        ))}
      </div>

      <Button
        variant="outline"
        className="mt-6"
        onClick={() => void navigate({ to: "/produkty" })}
      >
        Zpět na produkty
      </Button>
    </div>
  );
}

// ---- Product Form ----

function ProductForm({ productType }: { productType: ProductType }) {
  const navigate = useNavigate();

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

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: () => catalogApi.getCategories(),
  });

  const createMutation = useMutation({
    mutationFn: () => {
      const prices: Record<string, number> = {};
      if (priceCZK) prices.CZK = Number(priceCZK);
      if (priceEUR) prices.EUR = Number(priceEUR);

      return adminApi.createProduct({
        title,
        slug,
        description: description || undefined,
        shortDescription: shortDescription || undefined,
        productType,
        prices,
        categoryIds: categoryIds.length > 0 ? categoryIds : undefined,
        metaTitle: metaTitle || undefined,
        metaDescription: metaDescription || undefined,
      });
    },
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

  const categories: CategoryResponse[] = categoriesQuery.data?.data ?? [];

  function toggleCategory(id: string) {
    setCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  }

  const isPending = createMutation.isPending;
  const typeLabel = PRODUCT_TYPES.find((t) => t.value === productType)?.label ?? productType;

  const showVariantsTab = productType === "PHYSICAL";
  const showFilesTab = productType === "EBOOK";
  const showMediaTab = productType === "AUDIO_VIDEO";

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <h2 className="text-2xl font-bold">Nový produkt</h2>
        <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
          {typeLabel}
        </span>
      </div>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Základní info</TabsTrigger>
          <TabsTrigger value="gallery">Galerie</TabsTrigger>
          {showVariantsTab && <TabsTrigger value="variants">Varianty</TabsTrigger>}
          {showFilesTab && <TabsTrigger value="files">Soubory</TabsTrigger>}
          {showMediaTab && <TabsTrigger value="media">Média</TabsTrigger>}
          <TabsTrigger value="seo">SEO</TabsTrigger>
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
                  <Label>Kategorie</Label>
                  <div className="mt-1 max-h-48 space-y-2 overflow-y-auto rounded-md border border-[var(--border)] p-3">
                    {categories.length === 0 ? (
                      <p className="text-sm text-[var(--muted-foreground)]">Zadne kategorie</p>
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

                {createMutation.isError && (
                  <p className="text-sm text-[var(--destructive)]">
                    Nepodařilo se vytvořit produkt. Zkuste to prosím znovu.
                  </p>
                )}

                <div className="flex gap-2">
                  <Button type="submit" disabled={isPending}>
                    {isPending ? "Vytvářím..." : "Vytvořit produkt"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void navigate({ to: "/produkty/novy" })}
                    disabled={isPending}
                  >
                    Změnit typ
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void navigate({ to: "/produkty" })}
                    disabled={isPending}
                  >
                    Zrušit
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gallery">
          <SaveFirstPlaceholder label="Galerie" />
        </TabsContent>

        {showVariantsTab && (
          <TabsContent value="variants">
            <SaveFirstPlaceholder label="Varianty" />
          </TabsContent>
        )}

        {showFilesTab && (
          <TabsContent value="files">
            <SaveFirstPlaceholder label="Soubory" />
          </TabsContent>
        )}

        {showMediaTab && (
          <TabsContent value="media">
            <SaveFirstPlaceholder label="Média" />
          </TabsContent>
        )}

        <TabsContent value="seo">
          <Card>
            <CardHeader>
              <CardTitle>SEO</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="metaTitle">Meta titulek</Label>
                <Input
                  id="metaTitle"
                  value={metaTitle}
                  onChange={(e) => setMetaTitle(e.target.value)}
                  disabled={isPending}
                  maxLength={255}
                />
              </div>
              <div>
                <Label htmlFor="metaDescription">Meta popis</Label>
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

// ---- Main Page ----

const VALID_TYPES = new Set<string>(["PHYSICAL", "EBOOK", "AUDIO_VIDEO", "ONLINE_EVENT", "RECURRING_EVENT", "OFFLINE_EVENT"]);

export function ProductNewPage() {
  const search = useSearch({ strict: false }) as { typ?: string };
  const selectedType = search.typ && VALID_TYPES.has(search.typ) ? (search.typ as ProductType) : null;

  if (!selectedType) {
    return <TypeSelectionStep />;
  }

  return <ProductForm productType={selectedType} />;
}
