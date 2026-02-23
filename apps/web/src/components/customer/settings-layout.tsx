"use client";

import type { ReactNode } from "react";
import { t } from "@lingui/core/macro";
import { Separator } from "@samofujera/ui";
import { User, Settings, Monitor, Trash2 } from "lucide-react";
import { SettingsNav } from "./settings-nav";

export function SettingsLayout({ children }: { children: ReactNode }) {
  const items = [
    { title: t`Profil`, href: "/muj-ucet/profil", icon: User },
    {
      title: t`Nastavení účtu`,
      href: "/muj-ucet/nastaveni-uctu",
      icon: Settings,
    },
    {
      title: t`Aktivní sezení`,
      href: "/muj-ucet/sezeni",
      icon: Monitor,
    },
    {
      title: t`Smazat účet`,
      href: "/muj-ucet/smazat-ucet",
      icon: Trash2,
    },
  ];

  return (
    <div>
      <div className="space-y-0.5">
        <h2 className="text-2xl font-bold tracking-tight">{t`Nastavení`}</h2>
        <p className="text-muted-foreground">
          {t`Spravujte svůj účet a nastavení.`}
        </p>
      </div>
      <Separator className="my-4 lg:my-6" />
      <div className="flex flex-1 flex-col space-y-2 lg:flex-row lg:space-y-0 lg:space-x-12">
        <aside className="lg:sticky lg:top-0 lg:w-48">
          <SettingsNav items={items} />
        </aside>
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
