"use client";

import Image from "next/image";
import Link from "next/link";
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@samofujera/ui";

interface BrandHeaderProps {
  section: string;
}

export function BrandHeader({ section }: BrandHeaderProps) {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton size="lg" asChild>
          <Link href="/">
            <Image
              src="/images/logo.png"
              alt="Sámo Fujera"
              width={32}
              height={32}
              className="size-8 shrink-0 object-contain"
            />
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-heading font-semibold">Sámo Fujera</span>
              <span className="truncate text-xs text-muted-foreground">{section}</span>
            </div>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
