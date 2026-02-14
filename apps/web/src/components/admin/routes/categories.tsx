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
  parentId: string;
  sortOrder: string;
}

const EMPTY_FORM: CategoryFormData = { name: "", slug: "", parentId: "", sortOrder: "0" };

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
        parentId: form.parentId || undefined,
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
        parentId: form.parentId || undefined,
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
      parentId: cat.parentId ?? "",
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

  function flattenForParentSelect(
    cats: CategoryResponse[],
    excludeId?: string,
    depth = 0,
  ): Array<{ id: string; name: string; depth: number }> {
    const result: Array<{ id: string; name: string; depth: number }> = [];
    for (const cat of cats) {
      if (cat.id !== excludeId) {
        result.push({ id: cat.id, name: cat.name, depth });
        if (cat.children?.length) {
          result.push(...flattenForParentSelect(cat.children, excludeId, depth + 1));
        }
      }
    }
    return result;
  }

  const allCategories = categoriesQuery.data?.data ?? [];

  function renderCategoryTree(categories: CategoryResponse[], depth = 0) {
    return categories.map((cat) => (
      <div key={cat.id}>
        <div
          className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3"
          style={{ paddingLeft: `${depth * 24 + 16}px` }}
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
        {cat.children?.length > 0 && renderCategoryTree(cat.children, depth + 1)}
      </div>
    ));
  }

  const activeMutation = createOpen ? createMutation : updateMutation;
  const parentOptions = flattenForParentSelect(allCategories, editCategory?.id);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold">Kategorie</h2>
        <Button onClick={openCreate}>Nová kategorie</Button>
      </div>

      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)]">
        {categoriesQuery.isLoading && (
          <p className="p-6 text-[var(--muted-foreground)]">Načítání kategorií...</p>
        )}

        {categoriesQuery.isError && (
          <p className="p-6 text-[var(--destructive)]">
            Nepodařilo se načíst kategorie. Zkuste to prosím znovu.
          </p>
        )}

        {categoriesQuery.isSuccess && (
          <>
            {allCategories.length === 0 ? (
              <p className="p-6 text-[var(--muted-foreground)]">Žádné kategorie.</p>
            ) : (
              renderCategoryTree(allCategories)
            )}
          </>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nová kategorie</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div>
              <Label htmlFor="create-name">Název</Label>
              <Input
                id="create-name"
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
                required
                disabled={createMutation.isPending}
              />
            </div>
            <div>
              <Label htmlFor="create-slug">Slug</Label>
              <Input
                id="create-slug"
                value={form.slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                required
                disabled={createMutation.isPending}
              />
            </div>
            <div>
              <Label htmlFor="create-parent">Nadřazená kategorie</Label>
              <select
                id="create-parent"
                value={form.parentId}
                onChange={(e) => setForm((prev) => ({ ...prev, parentId: e.target.value }))}
                disabled={createMutation.isPending}
                className="flex w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
              >
                <option value="">-- Kořenová kategorie --</option>
                {parentOptions.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {"  ".repeat(cat.depth)}{cat.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="create-sort">Pořadí</Label>
              <Input
                id="create-sort"
                type="number"
                value={form.sortOrder}
                onChange={(e) => setForm((prev) => ({ ...prev, sortOrder: e.target.value }))}
                required
                disabled={createMutation.isPending}
              />
            </div>
            {createMutation.isError && (
              <p className="text-sm text-[var(--destructive)]">
                Nepodařilo se vytvořit kategorii.
              </p>
            )}
            <DialogFooter>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Vytvářím..." : "Vytvořit"}
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
            <div>
              <Label htmlFor="edit-name">Název</Label>
              <Input
                id="edit-name"
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
                required
                disabled={updateMutation.isPending}
              />
            </div>
            <div>
              <Label htmlFor="edit-slug">Slug</Label>
              <Input
                id="edit-slug"
                value={form.slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                required
                disabled={updateMutation.isPending}
              />
            </div>
            <div>
              <Label htmlFor="edit-parent">Nadřazená kategorie</Label>
              <select
                id="edit-parent"
                value={form.parentId}
                onChange={(e) => setForm((prev) => ({ ...prev, parentId: e.target.value }))}
                disabled={updateMutation.isPending}
                className="flex w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
              >
                <option value="">-- Kořenová kategorie --</option>
                {parentOptions.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {"  ".repeat(cat.depth)}{cat.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="edit-sort">Pořadí</Label>
              <Input
                id="edit-sort"
                type="number"
                value={form.sortOrder}
                onChange={(e) => setForm((prev) => ({ ...prev, sortOrder: e.target.value }))}
                required
                disabled={updateMutation.isPending}
              />
            </div>
            {updateMutation.isError && (
              <p className="text-sm text-[var(--destructive)]">
                Nepodařilo se uložit změny.
              </p>
            )}
            <DialogFooter>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Ukládání..." : "Uložit"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
