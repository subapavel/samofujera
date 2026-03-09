"use client";

import type { ReactNode } from "react";
import { t } from "@lingui/core/macro";
import { Separator } from "@samofujera/ui";
import { Settings, Truck, CreditCard, Bell, PackageOpen, Coins, Percent } from "lucide-react";
import { SettingsNav } from "@/components/customer/settings-nav";

export function StoreSettingsLayout({ children }: { children: ReactNode }) {
  const items = [
    {
      title: t`Obecné`,
      href: "/admin/nastaveni/obecne",
      icon: Settings,
    },
    {
      title: t`Doprava`,
      href: "/admin/nastaveni/doprava",
      icon: Truck,
    },
    {
      title: t`Platby`,
      href: "/admin/nastaveni/platby",
      icon: CreditCard,
    },
    {
      title: t`Produkty`,
      href: "/admin/nastaveni/produkty",
      icon: PackageOpen,
    },
    {
      title: t`Měny`,
      href: "/admin/nastaveni/meny",
      icon: Coins,
    },
    {
      title: t`Daňové sazby`,
      href: "/admin/nastaveni/dane",
      icon: Percent,
    },
    {
      title: t`Notifikace`,
      href: "/admin/nastaveni/notifikace",
      icon: Bell,
    },
  ];

  return (
    <div>
      <div className="space-y-0.5">
        <h2 className="text-2xl font-bold tracking-tight">
          {t`Nastavení obchodu`}
        </h2>
        <p className="text-muted-foreground">
          {t`Spravujte nastavení vašeho obchodu.`}
        </p>
      </div>
      <Separator className="my-4 lg:my-6" />
      <div className="flex flex-1 flex-col space-y-2 lg:flex-row lg:space-y-0 lg:space-x-12">
        <aside className="lg:sticky lg:top-0 lg:w-48">
          <SettingsNav items={items} />
        </aside>
        <div className="flex-1 max-w-3xl">{children}</div>
      </div>
    </div>
  );
}
