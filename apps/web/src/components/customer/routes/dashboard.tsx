"use client";

import Link from "next/link";
import { t } from "@lingui/core/macro";
import { BookOpen, Package, Settings, User } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@samofujera/ui";
import { PageHeader } from "@/components/dashboard/page-header";

const quickLinks = () => [
  {
    href: "/muj-ucet/objednavky",
    title: t`Objednávky`,
    description: t`Přehled vašich objednávek a jejich stavu.`,
    icon: Package,
  },
  {
    href: "/muj-ucet/knihovna",
    title: t`Knihovna`,
    description: t`Vaše zakoupené produkty a obsah ke stažení.`,
    icon: BookOpen,
  },
  {
    href: "/muj-ucet/nastaveni",
    title: t`Profil`,
    description: t`Upravte své osobní údaje a nastavení.`,
    icon: User,
  },
  {
    href: "/muj-ucet/nastaveni/sezeni",
    title: t`Aktivní sezení`,
    description: t`Spravujte svá přihlášená zařízení.`,
    icon: Settings,
  },
];

export function DashboardPage() {
  const links = quickLinks();

  return (
    <div className="flex flex-1 flex-col gap-4 sm:gap-6">
      <PageHeader
        title={t`Nástěnka`}
        subtitle={t`Vítejte ve svém zákaznickém panelu.`}
      />

      <Card>
        <CardHeader>
          <CardTitle>{t`Vítejte`}</CardTitle>
          <CardDescription>
            {t`Pomocí navigace vlevo můžete spravovat svůj profil, objednávky, knihovnu nebo účet.`}
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {links.map((link) => (
          <Link key={link.href} href={link.href} className="group">
            <Card className="transition-colors group-hover:bg-accent/50">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <link.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{link.title}</CardTitle>
                    <CardDescription>{link.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
