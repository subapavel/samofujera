"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { t } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@samofujera/ui";
import { userApi } from "@samofujera/api-client";
import { BrandHeader } from "./brand-header";
import { NavGroup } from "./nav-group";
import { NavUser } from "./nav-user";
import { adminSidebarData } from "./sidebar-data";
import { customerSidebarData } from "./customer-sidebar-data";

export function AppSidebar() {
  const { _ } = useLingui();
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");
  const data = isAdmin ? adminSidebarData : customerSidebarData;

  const [user, setUser] = useState<{ name: string; email: string } | null>(
    null,
  );
  useEffect(() => {
    userApi
      .getProfile()
      .then((res) => setUser({ name: res.data.name, email: res.data.email }))
      .catch(() => {});
  }, []);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <BrandHeader section={isAdmin ? t`Administrace` : t`Můj účet`} />
      </SidebarHeader>
      <SidebarContent>
        {data.navGroups.map((group) => (
          <NavGroup key={_(group.title)} {...group} />
        ))}
      </SidebarContent>
      <SidebarFooter>{user && <NavUser user={user} />}</SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
