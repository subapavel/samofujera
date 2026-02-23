"use client";

import { t } from "@lingui/core/macro";
import { DataTable } from "@/components/data-table";
import type { FilterConfig } from "@/components/data-table";
import { PageHeader } from "@/components/dashboard/page-header";
import {
  useUsersColumns,
  type UserRow,
} from "@/components/admin/users/users-columns";
import { UserCreateDialog } from "@/components/admin/users/user-create-dialog";

// Mock data — replace with API call when user endpoints are implemented
const MOCK_USERS: UserRow[] = [
  {
    id: "1",
    name: "Pavol Subapav",
    email: "subapav@gmail.com",
    role: "ADMIN",
    status: "ACTIVE",
    createdAt: "2026-01-15T10:00:00Z",
  },
  {
    id: "2",
    name: "Jana Nováková",
    email: "jana@example.com",
    role: "CUSTOMER",
    status: "ACTIVE",
    createdAt: "2026-02-01T14:30:00Z",
  },
  {
    id: "3",
    name: "Petr Svoboda",
    email: "petr@example.com",
    role: "CUSTOMER",
    status: "BLOCKED",
    createdAt: "2026-02-10T09:15:00Z",
  },
];

export function UsersPage() {
  const columns = useUsersColumns();

  const statusOptions = [
    { label: t`Aktivní`, value: "ACTIVE" },
    { label: t`Zablokovaný`, value: "BLOCKED" },
  ];

  const roleOptions = [
    { label: t`Administrátor`, value: "ADMIN" },
    { label: t`Zákazník`, value: "CUSTOMER" },
  ];

  const filters: FilterConfig[] = [
    { columnId: "status", title: t`Stav`, options: statusOptions },
    { columnId: "role", title: t`Role`, options: roleOptions },
  ];

  return (
    <div className="flex flex-1 flex-col gap-4 sm:gap-6">
      <PageHeader
        title={t`Uživatelé`}
        subtitle={t`Správa uživatelských účtů.`}
      >
        <UserCreateDialog />
      </PageHeader>

      <DataTable
        columns={columns}
        data={MOCK_USERS}
        searchKey="name"
        searchPlaceholder={t`Filtrovat uživatele...`}
        filters={filters}
      />
    </div>
  );
}
