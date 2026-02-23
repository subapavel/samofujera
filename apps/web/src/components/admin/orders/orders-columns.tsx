"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { t } from "@lingui/core/macro";
import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import type { MessageDescriptor } from "@lingui/core";
import { MoreHorizontal } from "lucide-react";
import type { OrderResponse } from "@samofujera/api-client";
import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@samofujera/ui";
import { DataTableColumnHeader } from "@/components/data-table";

const STATUS_LABELS: Record<string, MessageDescriptor> = {
  PENDING: msg`Čekající`,
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

export function useOrdersColumns(): ColumnDef<OrderResponse>[] {
  const { _ } = useLingui();

  return useMemo(() => {
    const columns: ColumnDef<OrderResponse>[] = [
      {
        accessorKey: "id",
        header: t`Objednávka`,
        cell: ({ row }) => (
          <Link
            href={`/admin/objednavky/${row.original.id}`}
            className="font-mono text-xs hover:underline"
          >
            {row.original.id.substring(0, 8)}...
          </Link>
        ),
        enableSorting: false,
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
          return `${order.totalAmount} ${order.currency}`;
        },
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
        id: "actions",
        cell: ({ row }) => {
          const order = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">{t`Otevřít menu`}</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/admin/objednavky/${order.id}`}>
                    {t`Zobrazit detail`}
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
        enableHiding: false,
      },
    ];

    return columns;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [_]);
}
