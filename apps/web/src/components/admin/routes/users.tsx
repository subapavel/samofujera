"use client";

import { useCallback } from "react";
import { t } from "@lingui/core/macro";
import { impersonationApi } from "@samofujera/api-client";
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
    id: "b620a0bf-e056-4dae-938e-cd3c772513ba",
    name: "Pavel",
    email: "admin@samofujera.cz",
    role: "ADMIN",
    status: "ACTIVE",
    createdAt: "2026-01-15T10:00:00Z",
  },
  {
    id: "d07cfb4a-3730-401a-b162-c410d55be4f3",
    name: "E2E User",
    email: "e2e-1771856868711@test.com",
    role: "CUSTOMER",
    status: "ACTIVE",
    createdAt: "2026-02-01T14:30:00Z",
  },
  {
    id: "191aeb6a-6de2-4730-b35e-7b67c5d14a57",
    name: "E2E User 2",
    email: "e2e-1771856872700@test.com",
    role: "CUSTOMER",
    status: "ACTIVE",
    createdAt: "2026-02-10T09:15:00Z",
  },
];

export function UsersPage() {
  const handleImpersonate = useCallback(async (user: UserRow) => {
    try {
      await impersonationApi.start(user.id);
      window.location.href = "/";
    } catch (err) {
      alert(t`Impersonaci se nepodařilo spustit.`);
    }
  }, []);

  const columns = useUsersColumns({ onImpersonate: handleImpersonate });

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
