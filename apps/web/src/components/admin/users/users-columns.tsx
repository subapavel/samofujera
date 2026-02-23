"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { t } from "@lingui/core/macro";
import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import type { MessageDescriptor } from "@lingui/core";
import { MoreHorizontal, Shield, User } from "lucide-react";
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

export interface UserRow {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "CUSTOMER";
  status: "ACTIVE" | "BLOCKED";
  createdAt: string;
}

const ROLE_LABELS: Record<string, MessageDescriptor> = {
  ADMIN: msg`Administrátor`,
  CUSTOMER: msg`Zákazník`,
};

const STATUS_LABELS: Record<string, MessageDescriptor> = {
  ACTIVE: msg`Aktivní`,
  BLOCKED: msg`Zablokovaný`,
};

const STATUS_VARIANT: Record<string, "default" | "destructive"> = {
  ACTIVE: "default",
  BLOCKED: "destructive",
};

interface UseUsersColumnsOptions {
  onEdit?: (user: UserRow) => void;
  onBlock?: (user: UserRow) => void;
  onDelete?: (user: UserRow) => void;
}

export function useUsersColumns(
  options?: UseUsersColumnsOptions,
): ColumnDef<UserRow>[] {
  const { _ } = useLingui();

  return useMemo(() => {
    const columns: ColumnDef<UserRow>[] = [
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
        accessorKey: "name",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t`Jméno`} />
        ),
        cell: ({ row }) => (
          <span className="font-medium">{row.getValue("name")}</span>
        ),
      },
      {
        accessorKey: "email",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t`E-mail`} />
        ),
      },
      {
        accessorKey: "role",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t`Role`} />
        ),
        cell: ({ row }) => {
          const role = row.getValue("role") as string;
          const Icon = role === "ADMIN" ? Shield : User;
          return (
            <div className="flex items-center gap-1.5">
              <Icon className="h-3.5 w-3.5 text-muted-foreground" />
              <Badge variant="outline">
                {_(ROLE_LABELS[role]) ?? role}
              </Badge>
            </div>
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
            <Badge variant={STATUS_VARIANT[status] ?? "default"}>
              {_(STATUS_LABELS[status]) ?? status}
            </Badge>
          );
        },
        filterFn: "arrIncludesSome",
      },
      {
        accessorKey: "createdAt",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t`Registrace`} />
        ),
        cell: ({ row }) =>
          new Date(row.getValue("createdAt") as string).toLocaleDateString(
            "cs-CZ",
          ),
      },
      {
        id: "actions",
        cell: ({ row }) => {
          const user = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">{t`Otevřít menu`}</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => options?.onEdit?.(user)}>
                  {t`Upravit`}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => options?.onBlock?.(user)}>
                  {user.status === "ACTIVE" ? t`Zablokovat` : t`Odblokovat`}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => options?.onDelete?.(user)}
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
  }, [_, options?.onEdit, options?.onBlock, options?.onDelete]);
}
