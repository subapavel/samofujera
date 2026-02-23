"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useParams } from "next/navigation";
import { t } from "@lingui/core/macro";
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
import { ImagePicker } from "../images/ImagePicker";
import type { ImagePickerResult } from "../images/ImagePicker";

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
  const params = useParams();
  const categoryId = params.categoryId as string;
  const router = useRouter();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManual, setSlugManual] = useState(false);
  const [description, setDescription] = useState("");
  const [imageMediaId, setImageMediaId] = useState<string | null>(null);
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [formLoaded, setFormLoaded] = useState(false);
  const [imagePickerOpen, setImagePickerOpen] = useState(false);

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
      router.push("/admin/produkty/kategorie");
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
      <p className="text-[var(--muted-foreground)]">{t`Načítání kategorie...`}</p>
    );
  }

  if (categoryQuery.isError) {
    return (
      <p className="text-[var(--destructive)]">
        {t`Nepodařilo se načíst kategorii. Zkuste to prosím znovu.`}
      </p>
    );
  }

  if (!category) {
    return (
      <p className="text-[var(--muted-foreground)]">{t`Kategorie nenalezena.`}</p>
    );
  }

  const isPending = updateMutation.isPending;

  return (
    <div>
      <h2 className="mb-4 text-2xl font-bold">{t`Upravit kategorii`}</h2>

      <Card>
        <CardHeader>
          <CardTitle>{t`Údaje o kategorii`}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">{t`Název`}</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
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
                rows={3}
                className={textareaClassName}
              />
            </div>

            <div>
              <Label>{t`Obrázek`}</Label>
              <div className="mt-1">
                {imageMediaId ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-[var(--muted-foreground)]">
                      {imageMediaId.slice(0, 8)}...
                    </span>
                    <button
                      type="button"
                      className="text-xs text-[var(--primary)] hover:underline"
                      onClick={() => setImagePickerOpen(true)}
                    >
                      {t`Změnit`}
                    </button>
                    <button
                      type="button"
                      className="text-xs text-[var(--destructive)] hover:underline"
                      onClick={() => setImageMediaId(null)}
                    >
                      {t`Odebrat`}
                    </button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setImagePickerOpen(true)}
                  >
                    {t`Vybrat obrázek`}
                  </Button>
                )}
                <ImagePicker
                  open={imagePickerOpen}
                  onOpenChange={setImagePickerOpen}
                  onSelect={(result: ImagePickerResult) => {
                    setImageMediaId(result.imageId);
                    setImagePickerOpen(false);
                  }}
                />
              </div>
            </div>

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
                rows={2}
                maxLength={500}
                className={textareaClassName}
              />
            </div>

            {updateMutation.isError && (
              <p className="text-sm text-[var(--destructive)]">
                {t`Nepodařilo se uložit změny. Zkuste to prosím znovu.`}
              </p>
            )}

            {updateMutation.isSuccess && (
              <p className="text-sm text-green-600">
                {t`Kategorie byla úspěšně uložena.`}
              </p>
            )}

            <div className="flex gap-2">
              <Button type="submit" disabled={isPending}>
                {isPending ? t`Ukládám...` : t`Uložit změny`}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/admin/produkty/kategorie")}
                disabled={isPending}
              >
                {t`Zpět na kategorie`}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
