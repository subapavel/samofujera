"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
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

export function CategoryNewPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManual, setSlugManual] = useState(false);
  const [description, setDescription] = useState("");
  const [imageMediaId, setImageMediaId] = useState<string | null>(null);
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
      <h2 className="mb-4 text-2xl font-bold">Nová kategorie</h2>

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

            {createMutation.isError && (
              <p className="text-sm text-[var(--destructive)]">
                Nepodařilo se vytvořit kategorii. Zkuste to prosím znovu.
              </p>
            )}

            <div className="flex gap-2">
              <Button type="submit" disabled={isPending}>
                {isPending ? "Vytvarim..." : "Vytvorit kategorii"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/admin/produkty/kategorie")}
                disabled={isPending}
              >
                Zrusit
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
