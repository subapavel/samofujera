"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { t } from "@lingui/core/macro";
import { MoreHorizontal } from "lucide-react";
import type { CategoryResponse } from "@samofujera/api-client";
import {
  Button,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@samofujera/ui";
import { DataTableColumnHeader } from "@/components/data-table";

interface UseCategoriesColumnsOptions {
  onDelete?: (id: string, name: string) => void;
}

export function useCategoriesColumns(
  options?: UseCategoriesColumnsOptions,
): ColumnDef<CategoryResponse>[] {
  return useMemo(() => {
    const columns: ColumnDef<CategoryResponse>[] = [
      {
        accessorKey: "name",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t`Nazev`} />
        ),
        cell: ({ row }) => (
          <Link
            href={`/admin/produkty/kategorie/${row.original.id}`}
            className="font-medium hover:underline"
          >
            {row.getValue("name")}
          </Link>
        ),
      },
      {
        accessorKey: "slug",
        header: t`Slug`,
        enableSorting: false,
      },
      {
        accessorKey: "sortOrder",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t`Poradi`} />
        ),
      },
      {
        id: "actions",
        cell: ({ row }) => {
          const category = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">{t`Otevrit menu`}</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/admin/produkty/kategorie/${category.id}`}>
                    {t`Upravit`}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() =>
                    options?.onDelete?.(category.id, category.name)
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
  }, [options?.onDelete]);
}
