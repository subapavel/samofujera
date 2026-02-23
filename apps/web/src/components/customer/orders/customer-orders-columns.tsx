"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { t } from "@lingui/core/macro";
import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import type { MessageDescriptor } from "@lingui/core";
import type { OrderResponse } from "@samofujera/api-client";
import { Badge } from "@samofujera/ui";
import { DataTableColumnHeader } from "@/components/data-table";

const STATUS_LABELS: Record<string, MessageDescriptor> = {
  PENDING: msg`Čeká na platbu`,
  PAID: msg`Zaplaceno`,
  SHIPPED: msg`Odesláno`,
  CANCELLED: msg`Zrušeno`,
  REFUNDED: msg`Vráceno`,
};

const STATUS_VARIANT: Record<
  string,
  "secondary" | "default" | "outline" | "destructive"
> = {
  PENDING: "secondary",
  PAID: "default",
  SHIPPED: "outline",
  CANCELLED: "destructive",
  REFUNDED: "destructive",
};

function formatPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat("cs-CZ", {
    style: "currency",
    currency,
  }).format(amount / 100);
}

export function useCustomerOrdersColumns(): ColumnDef<OrderResponse>[] {
  const { _ } = useLingui();

  return useMemo(() => {
    const columns: ColumnDef<OrderResponse>[] = [
      {
        accessorKey: "id",
        header: t`Objednávka`,
        cell: ({ row }) => (
          <Link
            href={`/muj-ucet/objednavky/${row.original.id}`}
            className="font-mono text-xs hover:underline"
          >
            {row.original.id.substring(0, 8)}...
          </Link>
        ),
        enableSorting: false,
      },
      {
        accessorKey: "createdAt",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t`Datum`} />
        ),
        cell: ({ row }) =>
          new Date(row.getValue("createdAt") as string).toLocaleDateString(
            "cs-CZ",
          ),
      },
      {
        accessorKey: "status",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t`Stav`} />
        ),
        cell: ({ row }) => {
          const status = row.getValue("status") as string;
          return (
            <Badge variant={STATUS_VARIANT[status] ?? "secondary"}>
              {_(STATUS_LABELS[status]) ?? status}
            </Badge>
          );
        },
        filterFn: "arrIncludesSome",
      },
      {
        accessorKey: "totalAmount",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t`Celkem`} />
        ),
        cell: ({ row }) => {
          const order = row.original;
          return formatPrice(order.totalAmount, order.currency);
        },
      },
    ];

    return columns;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [_]);
}
