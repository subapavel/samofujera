import {
  LayoutDashboard,
  FileText,
  Image,
  Package,
  Tags,
  ShoppingCart,
  Users,
  Crown,
} from "lucide-react";
import { msg } from "@lingui/core/macro";
import type { SidebarData } from "./types";

export const adminSidebarData: SidebarData = {
  navGroups: [
    {
      title: msg`Obecné`,
      items: [
        { title: msg`Nástěnka`, url: "/admin", icon: LayoutDashboard },
      ],
    },
    {
      title: msg`Obsah`,
      items: [
        { title: msg`Stránky`, url: "/admin/stranky", icon: FileText },
        { title: msg`Obrázky`, url: "/admin/obrazky", icon: Image },
      ],
    },
    {
      title: msg`Prodej`,
      items: [
        { title: msg`Produkty`, url: "/admin/produkty", icon: Package },
        { title: msg`Kategorie`, url: "/admin/produkty/kategorie", icon: Tags },
        { title: msg`Objednávky`, url: "/admin/objednavky", icon: ShoppingCart },
        { title: msg`Členství`, url: "/admin/clenstvi", icon: Crown },
      ],
    },
    {
      title: msg`Systém`,
      items: [
        { title: msg`Uživatelé`, url: "/admin/users", icon: Users },
      ],
    },
  ],
};
