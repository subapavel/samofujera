"use client";

import { usePathname, useRouter } from "next/navigation";
import { authApi } from "@samofujera/api-client";
import { Button } from "@samofujera/ui";

export function DashboardHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const isAdmin = pathname.startsWith("/admin");
  const headerLabel = isAdmin ? "Samo Fujera -- Administrace" : "Samo Fujera -- Muj ucet";

  async function handleLogout() {
    try {
      await authApi.logout();
    } finally {
      router.push("/prihlaseni");
    }
  }

  return (
    <header className="flex h-14 items-center justify-between border-b border-[var(--border)] px-6">
      <span className="text-sm font-medium text-[var(--muted-foreground)]">
        {headerLabel}
      </span>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => void handleLogout()}
      >
        Odhlasit se
      </Button>
    </header>
  );
}
