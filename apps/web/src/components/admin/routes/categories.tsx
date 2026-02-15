import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi, catalogApi } from "@samofujera/api-client";
import type { CategoryResponse } from "@samofujera/api-client";
import {
  Button,
  Input,
  Label,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@samofujera/ui";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

interface CategoryFormData {
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  metaTitle: string;
  metaDescription: string;
  sortOrder: string;
}

const EMPTY_FORM: CategoryFormData = {
  name: "",
  slug: "",
  description: "",
  imageUrl: "",
  metaTitle: "",
  metaDescription: "",
  sortOrder: "0",
};

const textareaClassName =
  "flex w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm ring-offset-[var(--background)] placeholder:text-[var(--muted-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2";

export function CategoriesPage() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editCategory, setEditCategory] = useState<CategoryResponse | null>(null);
  const [form, setForm] = useState<CategoryFormData>(EMPTY_FORM);
  const [slugManual, setSlugManual] = useState(false);

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: () => catalogApi.getCategories(),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      adminApi.createCategory({
        name: form.name,
        slug: form.slug,
        description: form.description || undefined,
        imageUrl: form.imageUrl || undefined,
        metaTitle: form.metaTitle || undefined,
        metaDescription: form.metaDescription || undefined,
        sortOrder: Number(form.sortOrder),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["categories"] });
      setCreateOpen(false);
      setForm(EMPTY_FORM);
      setSlugManual(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: () => {
      if (!editCategory) throw new Error("No category selected");
      return adminApi.updateCategory(editCategory.id, {
        name: form.name,
        slug: form.slug,
        description: form.description || undefined,
        imageUrl: form.imageUrl || undefined,
        metaTitle: form.metaTitle || undefined,
        metaDescription: form.metaDescription || undefined,
        sortOrder: Number(form.sortOrder),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["categories"] });
      setEditCategory(null);
      setForm(EMPTY_FORM);
      setSlugManual(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteCategory(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });

  function handleNameChange(value: string) {
    setForm((prev) => ({
      ...prev,
      name: value,
      slug: slugManual ? prev.slug : slugify(value),
    }));
  }

  function handleSlugChange(value: string) {
    setSlugManual(true);
    setForm((prev) => ({ ...prev, slug: value }));
  }

  function openCreate() {
    setForm(EMPTY_FORM);
    setSlugManual(false);
    createMutation.reset();
    setCreateOpen(true);
  }

  function openEdit(cat: CategoryResponse) {
    setForm({
      name: cat.name,
      slug: cat.slug,
      description: cat.description ?? "",
      imageUrl: cat.imageUrl ?? "",
      metaTitle: cat.metaTitle ?? "",
      metaDescription: cat.metaDescription ?? "",
      sortOrder: String(cat.sortOrder),
    });
    setSlugManual(true);
    updateMutation.reset();
    setEditCategory(cat);
  }

  function handleDelete(cat: CategoryResponse) {
    if (window.confirm(`Opravdu chcete smazat kategorii "${cat.name}"?`)) {
      deleteMutation.mutate(cat.id);
    }
  }

  function handleCreateSubmit(event: React.FormEvent) {
    event.preventDefault();
    createMutation.mutate();
  }

  function handleEditSubmit(event: React.FormEvent) {
    event.preventDefault();
    updateMutation.mutate();
  }

  const allCategories = categoriesQuery.data?.data ?? [];
  const sortedCategories = [...allCategories].sort((a, b) => a.sortOrder - b.sortOrder);

  function renderFormFields(prefix: string, isPending: boolean) {
    return (
      <>
        <div>
          <Label htmlFor={`${prefix}-name`}>Nazev</Label>
          <Input
            id={`${prefix}-name`}
            value={form.name}
            onChange={(e) => handleNameChange(e.target.value)}
            required
            disabled={isPending}
          />
        </div>
        <div>
          <Label htmlFor={`${prefix}-slug`}>Slug</Label>
          <Input
            id={`${prefix}-slug`}
            value={form.slug}
            onChange={(e) => handleSlugChange(e.target.value)}
            required
            disabled={isPending}
          />
        </div>
        <div>
          <Label htmlFor={`${prefix}-description`}>Popis</Label>
          <textarea
            id={`${prefix}-description`}
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            disabled={isPending}
            rows={3}
            className={textareaClassName}
          />
        </div>
        <div>
          <Label htmlFor={`${prefix}-imageUrl`}>URL obrazku</Label>
          <Input
            id={`${prefix}-imageUrl`}
            value={form.imageUrl}
            onChange={(e) => setForm((prev) => ({ ...prev, imageUrl: e.target.value }))}
            disabled={isPending}
            placeholder="https://..."
          />
        </div>
        <div>
          <Label htmlFor={`${prefix}-metaTitle`}>Meta titulek</Label>
          <Input
            id={`${prefix}-metaTitle`}
            value={form.metaTitle}
            onChange={(e) => setForm((prev) => ({ ...prev, metaTitle: e.target.value }))}
            disabled={isPending}
            maxLength={255}
          />
        </div>
        <div>
          <Label htmlFor={`${prefix}-metaDescription`}>Meta popis</Label>
          <textarea
            id={`${prefix}-metaDescription`}
            value={form.metaDescription}
            onChange={(e) => setForm((prev) => ({ ...prev, metaDescription: e.target.value }))}
            disabled={isPending}
            rows={2}
            maxLength={500}
            className={textareaClassName}
          />
        </div>
        <div>
          <Label htmlFor={`${prefix}-sort`}>Poradi</Label>
          <Input
            id={`${prefix}-sort`}
            type="number"
            value={form.sortOrder}
            onChange={(e) => setForm((prev) => ({ ...prev, sortOrder: e.target.value }))}
            required
            disabled={isPending}
          />
        </div>
      </>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold">Kategorie</h2>
        <Button onClick={openCreate}>Nova kategorie</Button>
      </div>

      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)]">
        {categoriesQuery.isLoading && (
          <p className="p-6 text-[var(--muted-foreground)]">Nacitani kategorii...</p>
        )}

        {categoriesQuery.isError && (
          <p className="p-6 text-[var(--destructive)]">
            Nepodarilo se nacist kategorie. Zkuste to prosim znovu.
          </p>
        )}

        {categoriesQuery.isSuccess && (
          <>
            {sortedCategories.length === 0 ? (
              <p className="p-6 text-[var(--muted-foreground)]">Zadne kategorie.</p>
            ) : (
              sortedCategories.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium">{cat.name}</span>
                    <span className="text-xs text-[var(--muted-foreground)]">{cat.slug}</span>
                    <span className="text-xs text-[var(--muted-foreground)]">#{cat.sortOrder}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEdit(cat)}>
                      Upravit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={deleteMutation.isPending}
                      onClick={() => handleDelete(cat)}
                    >
                      Smazat
                    </Button>
                  </div>
                </div>
              ))
            )}
          </>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova kategorie</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            {renderFormFields("create", createMutation.isPending)}
            {createMutation.isError && (
              <p className="text-sm text-[var(--destructive)]">
                Nepodarilo se vytvorit kategorii.
              </p>
            )}
            <DialogFooter>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Vytvari se..." : "Vytvorit"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editCategory !== null} onOpenChange={(open) => !open && setEditCategory(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upravit kategorii</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            {renderFormFields("edit", updateMutation.isPending)}
            {updateMutation.isError && (
              <p className="text-sm text-[var(--destructive)]">
                Nepodarilo se ulozit zmeny.
              </p>
            )}
            <DialogFooter>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Ukladani..." : "Ulozit"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
