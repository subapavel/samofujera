"use client";

import { useQuery } from "@tanstack/react-query";
import { t } from "@lingui/core/macro";
import { Loader2 } from "lucide-react";
import { ordersApi } from "@samofujera/api-client";
import { DataTable } from "@/components/data-table";
import type { FilterConfig } from "@/components/data-table";
import { PageHeader } from "@/components/dashboard/page-header";
import { useCustomerOrdersColumns } from "@/components/customer/orders/customer-orders-columns";

export function OrdersPage() {
  const ordersQuery = useQuery({
    queryKey: ["orders"],
    queryFn: () => ordersApi.getMyOrders({ limit: 100 }),
  });

  const columns = useCustomerOrdersColumns();
  const data = ordersQuery.data?.data?.items ?? [];

  const statusOptions = [
    { label: t`Čeká na platbu`, value: "PENDING" },
    { label: t`Zaplaceno`, value: "PAID" },
    { label: t`Odesláno`, value: "SHIPPED" },
    { label: t`Zrušeno`, value: "CANCELLED" },
    { label: t`Vráceno`, value: "REFUNDED" },
  ];

  const filters: FilterConfig[] = [
    { columnId: "status", title: t`Stav`, options: statusOptions },
  ];

  return (
    <div className="flex flex-1 flex-col gap-4 sm:gap-6">
      <PageHeader
        title={t`Objednávky`}
        subtitle={t`Přehled vašich objednávek.`}
      />

      {ordersQuery.isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : ordersQuery.isError ? (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-6 text-center text-sm text-destructive">
          {t`Nepodařilo se načíst objednávky. Zkuste to prosím znovu.`}
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={data}
          filters={filters}
        />
      )}
    </div>
  );
}
