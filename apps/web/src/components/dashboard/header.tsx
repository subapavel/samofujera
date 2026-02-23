"use client";

import { Separator, SidebarTrigger } from "@samofujera/ui";
import { ThemeSwitch } from "./theme-switch";
import { DashboardBreadcrumbs } from "./dashboard-breadcrumbs";

export function Header() {
  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <DashboardBreadcrumbs />
      <div className="flex-1" />
      <ThemeSwitch />
    </header>
  );
}
