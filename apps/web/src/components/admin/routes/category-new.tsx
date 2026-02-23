"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
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

export function CategoryNewPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManual, setSlugManual] = useState(false);
  const [description, setDescription] = useState("");
  const [imageMediaId, setImageMediaId] = useState<string | null>(null);
  const [imagePickerOpen, setImagePickerOpen] = useState(false);
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");

  const createMutation = useMutation({
    mutationFn: () =>
      adminApi.createCategory({
        name,
        slug,
        description: description || undefined,
        imageMediaId: imageMediaId ?? undefined,
        metaTitle: metaTitle || undefined,
        metaDescription: metaDescription || undefined,
      }),
    onSuccess: () => {
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
    createMutation.mutate();
  }

  const isPending = createMutation.isPending;

  return (
    <div>
      <h2 className="mb-4 text-2xl font-bold">{t`Nová kategorie`}</h2>

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

            {createMutation.isError && (
              <p className="text-sm text-[var(--destructive)]">
                {t`Nepodařilo se vytvořit kategorii. Zkuste to prosím znovu.`}
              </p>
            )}

            <div className="flex gap-2">
              <Button type="submit" disabled={isPending}>
                {isPending ? t`Vytvářím...` : t`Vytvořit kategorii`}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/admin/produkty/kategorie")}
                disabled={isPending}
              >
                {t`Zrušit`}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
