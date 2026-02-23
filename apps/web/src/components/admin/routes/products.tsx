"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { t } from "@lingui/core/macro";
import { Plus, Loader2 } from "lucide-react";
import { adminApi } from "@samofujera/api-client";
import { Button } from "@samofujera/ui";
import { DataTable } from "@/components/data-table";
import type { FilterConfig } from "@/components/data-table";
import { PageHeader } from "@/components/dashboard/page-header";
import { useProductsColumns } from "@/components/admin/products/products-columns";
import { ProductCreateDialog } from "@/components/admin/products/product-create-dialog";
import { ProductEditDialog } from "@/components/admin/products/product-edit-dialog";

export function ProductsPage() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editProductId, setEditProductId] = useState<string | null>(null);

  const productsQuery = useQuery({
    queryKey: ["admin", "products"],
    queryFn: () => adminApi.getProducts({ limit: 100 }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteProduct(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
    },
  });

  const handleDelete = useCallback(
    (id: string, title: string) => {
      if (window.confirm(t`Opravdu chcete smazat produkt "${title}"?`)) {
        deleteMutation.mutate(id);
      }
    },
    [deleteMutation],
  );

  const columns = useProductsColumns({
    onDelete: handleDelete,
    onEdit: (id) => setEditProductId(id),
  });
  const data = productsQuery.data?.data?.items ?? [];

  const statusOptions = [
    { label: t`Draft`, value: "DRAFT" },
    { label: t`Publikováno`, value: "ACTIVE" },
    { label: t`Archivováno`, value: "ARCHIVED" },
  ];

  const typeOptions = [
    { label: t`Fyzický`, value: "PHYSICAL" },
    { label: t`E-book`, value: "EBOOK" },
    { label: t`Audio/Video`, value: "AUDIO_VIDEO" },
    { label: t`Online událost`, value: "ONLINE_EVENT" },
    { label: t`Opakovaná událost`, value: "RECURRING_EVENT" },
    { label: t`Offline událost`, value: "OFFLINE_EVENT" },
  ];

  const filters: FilterConfig[] = [
    { columnId: "status", title: t`Stav`, options: statusOptions },
    { columnId: "productType", title: t`Typ`, options: typeOptions },
  ];

  return (
    <div className="flex flex-1 flex-col gap-4 sm:gap-6">
      <PageHeader
        title={t`Produkty`}
        subtitle={t`Spravujte produkty a jejich ceny.`}
      >
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t`Nový produkt`}
        </Button>
      </PageHeader>

      {productsQuery.isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : productsQuery.isError ? (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-6 text-center text-sm text-destructive">
          {t`Nepodařilo se načíst produkty. Zkuste to prosím znovu.`}
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={data}
          searchKey="title"
          searchPlaceholder={t`Filtrovat produkty...`}
          filters={filters}
        />
      )}

      <ProductCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(id) => {
          setCreateOpen(false);
          setEditProductId(id);
        }}
      />

      <ProductEditDialog
        productId={editProductId}
        open={editProductId !== null}
        onOpenChange={(open) => { if (!open) setEditProductId(null); }}
      />
    </div>
  );
}
