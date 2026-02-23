"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { t } from "@lingui/core/macro";
import { Plus, Loader2 } from "lucide-react";
import { pageAdminApi } from "@samofujera/api-client";
import { Button } from "@samofujera/ui";
import { DataTable } from "@/components/data-table";
import type { FilterConfig } from "@/components/data-table";
import { PageHeader } from "@/components/dashboard/page-header";
import { usePagesColumns } from "@/components/admin/pages/pages-columns";
import { PageCreateSheet } from "@/components/admin/pages/page-create-sheet";

export function PagesListPage() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);

  const pagesQuery = useQuery({
    queryKey: ["admin", "pages"],
    queryFn: () => pageAdminApi.getPages({ limit: 100 }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => pageAdminApi.deletePage(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "pages"] });
    },
  });

  const handleDelete = useCallback(
    (id: string, title: string) => {
      if (window.confirm(t`Opravdu chcete smazat stranku "${title}"?`)) {
        deleteMutation.mutate(id);
      }
    },
    [deleteMutation],
  );

  const columns = usePagesColumns({ onDelete: handleDelete });
  const data = pagesQuery.data?.data?.items ?? [];

  const statusOptions = [
    { label: t`Koncept`, value: "DRAFT" },
    { label: t`Publikovano`, value: "PUBLISHED" },
  ];

  const filters: FilterConfig[] = [
    { columnId: "status", title: t`Stav`, options: statusOptions },
  ];

  return (
    <div className="flex flex-1 flex-col gap-4 sm:gap-6">
      <PageHeader
        title={t`Stranky`}
        subtitle={t`Spravujte stranky webu.`}
      >
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t`Nova stranka`}
        </Button>
      </PageHeader>

      {pagesQuery.isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : pagesQuery.isError ? (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-6 text-center text-sm text-destructive">
          {t`Nepodarilo se nacist stranky. Zkuste to prosim znovu.`}
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={data}
          searchKey="title"
          searchPlaceholder={t`Filtrovat stranky...`}
          filters={filters}
        />
      )}

      <PageCreateSheet open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
