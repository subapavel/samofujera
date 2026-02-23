"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { t } from "@lingui/core/macro";
import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import type { MessageDescriptor } from "@lingui/core";
import { MoreHorizontal } from "lucide-react";
import type { ProductResponse } from "@samofujera/api-client";
import {
  Badge,
  Button,
  Checkbox,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@samofujera/ui";
import { DataTableColumnHeader } from "@/components/data-table";

const PRODUCT_TYPE_LABELS: Record<string, MessageDescriptor> = {
  PHYSICAL: msg`Fyzický`,
  EBOOK: msg`E-book`,
  AUDIO_VIDEO: msg`Audio/Video`,
  ONLINE_EVENT: msg`Online událost`,
  RECURRING_EVENT: msg`Opakovaná událost`,
  OFFLINE_EVENT: msg`Offline událost`,
};

const STATUS_LABELS: Record<string, MessageDescriptor> = {
  DRAFT: msg`Draft`,
  ACTIVE: msg`Publikováno`,
  ARCHIVED: msg`Archivováno`,
};

const STATUS_VARIANT: Record<string, "secondary" | "default" | "destructive"> =
  {
    DRAFT: "secondary",
    ACTIVE: "default",
    ARCHIVED: "destructive",
  };

function formatPrices(prices: Record<string, number>): string {
  const entries = Object.entries(prices);
  if (entries.length === 0) return "--";
  return entries
    .map(([currency, amount]) => `${amount} ${currency}`)
    .join(" / ");
}

interface UseProductsColumnsOptions {
  onDelete?: (id: string, title: string) => void;
  onEdit?: (id: string) => void;
}

export function useProductsColumns(
  options?: UseProductsColumnsOptions,
): ColumnDef<ProductResponse>[] {
  const { _ } = useLingui();

  return useMemo(() => {
    const columns: ColumnDef<ProductResponse>[] = [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value) =>
              table.toggleAllPageRowsSelected(!!value)
            }
            aria-label={t`Vybrat vše`}
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label={t`Vybrat řádek`}
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: "title",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t`Název`} />
        ),
        cell: ({ row }) => (
          <button
            type="button"
            className="font-medium hover:underline text-left"
            onClick={() => options?.onEdit?.(row.original.id)}
          >
            {row.getValue("title")}
          </button>
        ),
      },
      {
        accessorKey: "productType",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t`Typ`} />
        ),
        cell: ({ row }) => {
          const type = row.getValue("productType") as string;
          return (
            <Badge variant="outline">
              {_(PRODUCT_TYPE_LABELS[type]) ?? type}
            </Badge>
          );
        },
        filterFn: "arrIncludesSome",
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
        accessorKey: "prices",
        header: t`Cena`,
        cell: ({ row }) => formatPrices(row.original.prices),
        enableSorting: false,
      },
      {
        id: "actions",
        cell: ({ row }) => {
          const product = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">{t`Otevřít menu`}</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => options?.onEdit?.(product.id)}>
                  {t`Upravit`}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() =>
                    options?.onDelete?.(product.id, product.title)
                  }
                >
                  {t`Smazat`}
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
  }, [_, options?.onDelete, options?.onEdit]);
}
