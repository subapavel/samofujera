"use client";

import { t } from "@lingui/core/macro";

export function DashboardPage() {
  return (
    <div>
      <h2 className="mb-4 text-2xl font-bold">{t`Nástěnka`}</h2>
      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
        <p className="text-[var(--muted-foreground)]">
          {t`Vítejte ve svém zákaznickém panelu. Pomocí navigace vlevo můžete spravovat svůj profil, aktivní sezení nebo účet.`}
        </p>
      </div>
    </div>
  );
}
