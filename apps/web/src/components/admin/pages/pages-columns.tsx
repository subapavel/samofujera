"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { t } from "@lingui/core/macro";
import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import type { MessageDescriptor } from "@lingui/core";
import { MoreHorizontal } from "lucide-react";
import type { PageResponse } from "@samofujera/api-client";
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

const STATUS_LABELS: Record<string, MessageDescriptor> = {
  DRAFT: msg`Koncept`,
  PUBLISHED: msg`Publikováno`,
};

const STATUS_VARIANT: Record<string, "secondary" | "default"> = {
  DRAFT: "secondary",
  PUBLISHED: "default",
};

interface UsePagesColumnsOptions {
  onDelete?: (id: string, title: string) => void;
}

export function usePagesColumns(
  options?: UsePagesColumnsOptions,
): ColumnDef<PageResponse>[] {
  const { _ } = useLingui();

  return useMemo(() => {
    const columns: ColumnDef<PageResponse>[] = [
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
          <Link
            href={`/admin/stranky/${row.original.id}/edit`}
            className="font-medium hover:underline"
          >
            {row.getValue("title")}
          </Link>
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
        accessorKey: "updatedAt",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t`Aktualizováno`} />
        ),
        cell: ({ row }) =>
          new Date(row.getValue("updatedAt") as string).toLocaleDateString(
            "cs-CZ",
          ),
      },
      {
        id: "actions",
        cell: ({ row }) => {
          const page = row.original;
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
                  <Link href={`/admin/stranky/${page.id}/edit`}>
                    {t`Upravit`}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() =>
                    options?.onDelete?.(page.id, page.title)
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
  }, [_, options?.onDelete]);
}
