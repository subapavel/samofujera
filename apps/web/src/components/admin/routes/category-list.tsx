"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { adminApi, catalogApi } from "@samofujera/api-client";
import type { CategoryResponse } from "@samofujera/api-client";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@samofujera/ui";

function SortableRow({
  category,
  onDelete,
  isDeleting,
}: {
  category: CategoryResponse;
  onDelete: (cat: CategoryResponse) => void;
  isDeleting: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className="border-b border-[var(--border)] last:border-b-0"
    >
      <td className="w-10 px-2 py-3">
        <button
          type="button"
          className="cursor-grab touch-none text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          {...attributes}
          {...listeners}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <circle cx="9" cy="6" r="1.5" />
            <circle cx="15" cy="6" r="1.5" />
            <circle cx="9" cy="12" r="1.5" />
            <circle cx="15" cy="12" r="1.5" />
            <circle cx="9" cy="18" r="1.5" />
            <circle cx="15" cy="18" r="1.5" />
          </svg>
        </button>
      </td>
      <td className="w-14 px-2 py-3">
        {category.imageUrl ? (
          <img
            src={category.imageUrl}
            alt={category.name}
            className="h-10 w-10 rounded object-cover"
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded bg-[var(--muted)] text-xs text-[var(--muted-foreground)]">
            --
          </div>
        )}
      </td>
      <td className="px-4 py-3 font-medium">{category.name}</td>
      <td className="px-4 py-3 text-[var(--muted-foreground)]">
        {category.slug}
      </td>
      <td className="px-4 py-3">
        <div className="flex gap-2">
          <Link href={`/admin/produkty/kategorie/${category.id}`}>
            <Button variant="outline" size="sm">
              Upravit
            </Button>
          </Link>
          <Button
            variant="destructive"
            size="sm"
            disabled={isDeleting}
            onClick={() => onDelete(category)}
          >
            Smazat
          </Button>
        </div>
      </td>
    </tr>
  );
}

export function CategoryListPage() {
  const queryClient = useQueryClient();

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: () => catalogApi.getCategories(),
  });

  const [localOrder, setLocalOrder] = useState<CategoryResponse[] | null>(null);

  const reorderMutation = useMutation({
    mutationFn: (categoryIds: string[]) =>
      adminApi.reorderCategories(categoryIds),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["categories"] });
      setLocalOrder(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteCategory(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDelete(cat: CategoryResponse) {
    if (window.confirm(`Opravdu chcete smazat kategorii "${cat.name}"?`)) {
      deleteMutation.mutate(cat.id);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const currentItems = localOrder ?? sortedCategories;
    const oldIndex = currentItems.findIndex((c) => c.id === active.id);
    const newIndex = currentItems.findIndex((c) => c.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(currentItems, oldIndex, newIndex);
    setLocalOrder(reordered);
    reorderMutation.mutate(reordered.map((c) => c.id));
  }

  const allCategories = categoriesQuery.data?.data ?? [];
  const sortedCategories = [...allCategories].sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );
  const displayCategories = localOrder ?? sortedCategories;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold">Kategorie</h2>
        <Link href="/admin/produkty/kategorie/nova">
          <Button>Nova kategorie</Button>
        </Link>
      </div>

      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)]">
        {categoriesQuery.isLoading && (
          <p className="p-6 text-[var(--muted-foreground)]">
            Nacitani kategorii...
          </p>
        )}

        {categoriesQuery.isError && (
          <p className="p-6 text-[var(--destructive)]">
            Nepodarilo se nacist kategorie. Zkuste to prosim znovu.
          </p>
        )}

        {categoriesQuery.isSuccess && (
          <>
            {displayCategories.length === 0 ? (
              <p className="p-6 text-[var(--muted-foreground)]">
                Zadne kategorie.
              </p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="w-10 px-2 py-3" />
                    <th className="w-14 px-2 py-3 font-medium text-[var(--muted-foreground)]">
                      Obrazek
                    </th>
                    <th className="px-4 py-3 font-medium text-[var(--muted-foreground)]">
                      Nazev
                    </th>
                    <th className="px-4 py-3 font-medium text-[var(--muted-foreground)]">
                      Slug
                    </th>
                    <th className="px-4 py-3 font-medium text-[var(--muted-foreground)]">
                      Akce
                    </th>
                  </tr>
                </thead>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={displayCategories.map((c) => c.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <tbody>
                      {displayCategories.map((cat) => (
                        <SortableRow
                          key={cat.id}
                          category={cat}
                          onDelete={handleDelete}
                          isDeleting={deleteMutation.isPending}
                        />
                      ))}
                    </tbody>
                  </SortableContext>
                </DndContext>
              </table>
            )}
          </>
        )}
      </div>
    </div>
  );
}
