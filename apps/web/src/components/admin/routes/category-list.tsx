"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { t } from "@lingui/core/macro";
import { Plus, Loader2 } from "lucide-react";
import { catalogApi, adminApi } from "@samofujera/api-client";
import { Button } from "@samofujera/ui";
import { DataTable } from "@/components/data-table";
import { PageHeader } from "@/components/dashboard/page-header";
import { useCategoriesColumns } from "@/components/admin/categories/categories-columns";
import { CategoryCreateDialog } from "@/components/admin/categories/category-create-dialog";

export function CategoryListPage() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);

  const categoriesQuery = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: () => catalogApi.getCategories(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteCategory(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "categories"] });
    },
  });

  const handleDelete = useCallback(
    (id: string, name: string) => {
      if (window.confirm(t`Opravdu chcete smazat kategorii "${name}"?`)) {
        deleteMutation.mutate(id);
      }
    },
    [deleteMutation],
  );

  const columns = useCategoriesColumns({ onDelete: handleDelete });
  const data = categoriesQuery.data?.data ?? [];
  const sortedData = [...data].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="flex flex-1 flex-col gap-4 sm:gap-6">
      <PageHeader
        title={t`Kategorie`}
        subtitle={t`Spravujte kategorie produktu.`}
      >
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t`Nova kategorie`}
        </Button>
      </PageHeader>

      {categoriesQuery.isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : categoriesQuery.isError ? (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-6 text-center text-sm text-destructive">
          {t`Nepodarilo se nacist kategorie. Zkuste to prosim znovu.`}
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={sortedData}
          searchKey="name"
          searchPlaceholder={t`Filtrovat kategorie...`}
        />
      )}

      <CategoryCreateDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
