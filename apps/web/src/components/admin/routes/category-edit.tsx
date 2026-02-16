import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "@tanstack/react-router";
import { adminApi } from "@samofujera/api-client";
import {
  Button,
  Input,
  Label,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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

const textareaClassName =
  "flex w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm ring-offset-[var(--background)] placeholder:text-[var(--muted-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2";

export function CategoryEditPage() {
  const { categoryId } = useParams({ strict: false }) as {
    categoryId: string;
  };
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManual, setSlugManual] = useState(false);
  const [description, setDescription] = useState("");
  const [imageMediaId, setImageMediaId] = useState<string | null>(null);
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [formLoaded, setFormLoaded] = useState(false);

  const categoryQuery = useQuery({
    queryKey: ["admin", "category", categoryId],
    queryFn: () => adminApi.getCategory(categoryId),
    enabled: Boolean(categoryId),
  });

  const category = categoryQuery.data?.data;

  useEffect(() => {
    if (category && !formLoaded) {
      setName(category.name);
      setSlug(category.slug);
      setSlugManual(true);
      setDescription(category.description ?? "");
      setImageMediaId(category.imageMediaId ?? null);
      setMetaTitle(category.metaTitle ?? "");
      setMetaDescription(category.metaDescription ?? "");
      setFormLoaded(true);
    }
  }, [category, formLoaded]);

  const updateMutation = useMutation({
    mutationFn: () =>
      adminApi.updateCategory(categoryId, {
        name,
        slug,
        description: description || undefined,
        imageMediaId: imageMediaId ?? undefined,
        metaTitle: metaTitle || undefined,
        metaDescription: metaDescription || undefined,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["admin", "category", categoryId],
      });
      await queryClient.invalidateQueries({ queryKey: ["categories"] });
      void navigate({ to: "/produkty/kategorie" });
    },
  });

  function handleNameChange(value: string) {
    setName(value);
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

  if (categoryQuery.isLoading) {
    return (
      <p className="text-[var(--muted-foreground)]">Nacitani kategorie...</p>
    );
  }

  if (categoryQuery.isError) {
    return (
      <p className="text-[var(--destructive)]">
        Nepodarilo se nacist kategorii. Zkuste to prosim znovu.
      </p>
    );
  }

  if (!category) {
    return (
      <p className="text-[var(--muted-foreground)]">Kategorie nenalezena.</p>
    );
  }

  const isPending = updateMutation.isPending;

  return (
    <div>
      <h2 className="mb-4 text-2xl font-bold">Upravit kategorii</h2>

      <Card>
        <CardHeader>
          <CardTitle>Udaje o kategorii</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Nazev</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
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
                rows={3}
                className={textareaClassName}
              />
            </div>

            <div>
              <Label>Obrazek</Label>
              <div className="mt-1">
                <MediaPicker
                  value={imageMediaId}
                  onChange={setImageMediaId}
                  accept="image/*"
                />
              </div>
            </div>

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
                rows={2}
                maxLength={500}
                className={textareaClassName}
              />
            </div>

            {updateMutation.isError && (
              <p className="text-sm text-[var(--destructive)]">
                Nepodarilo se ulozit zmeny. Zkuste to prosim znovu.
              </p>
            )}

            {updateMutation.isSuccess && (
              <p className="text-sm text-green-600">
                Kategorie byla uspesne ulozena.
              </p>
            )}

            <div className="flex gap-2">
              <Button type="submit" disabled={isPending}>
                {isPending ? "Ukladam..." : "Ulozit zmeny"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => void navigate({ to: "/produkty/kategorie" })}
                disabled={isPending}
              >
                Zpet na kategorie
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
