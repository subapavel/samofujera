"use client";

import { Fragment } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { t } from "@lingui/core/macro";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@samofujera/ui";

function getSegmentLabel(segment: string): string {
  const labels: Record<string, () => string> = {
    admin: () => t`Administrace`,
    "muj-ucet": () => t`Můj účet`,
    produkty: () => t`Produkty`,
    kategorie: () => t`Kategorie`,
    stranky: () => t`Stránky`,
    objednavky: () => t`Objednávky`,
    obrazky: () => t`Obrázky`,
    users: () => t`Uživatelé`,
    profile: () => t`Profil`,
    knihovna: () => t`Knihovna`,
    sessions: () => t`Sezení`,
    clenstvi: () => t`Členství`,
    predplatne: () => t`Předplatné`,
    "delete-account": () => t`Smazat účet`,
    novy: () => t`Nový`,
    nova: () => t`Nová`,
    edit: () => t`Upravit`,
  };
  return labels[segment]?.() ?? segment;
}

export function DashboardBreadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length <= 1) return null;

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {segments.map((segment, index) => {
          const href = "/" + segments.slice(0, index + 1).join("/");
          const isLast = index === segments.length - 1;
          const isUuid = /^[a-f0-9-]{36}$/.test(segment);
          const label = isUuid ? t`Detail` : getSegmentLabel(segment);

          return (
            <Fragment key={href}>
              {index > 0 && <BreadcrumbSeparator />}
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={href}>{label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
