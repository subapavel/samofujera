import {
  LayoutDashboard,
  FileText,
  Image,
  Package,
  Tags,
  ShoppingCart,
  Users,
} from "lucide-react";
import type { SidebarData } from "./types";

export const adminSidebarData: SidebarData = {
  navGroups: [
    {
      title: "Obecné",
      items: [
        { title: "Nástěnka", url: "/admin", icon: LayoutDashboard },
      ],
    },
    {
      title: "Obsah",
      items: [
        { title: "Stránky", url: "/admin/stranky", icon: FileText },
        { title: "Média", url: "/admin/media", icon: Image },
      ],
    },
    {
      title: "Prodej",
      items: [
        { title: "Produkty", url: "/admin/produkty", icon: Package },
        { title: "Kategorie", url: "/admin/produkty/kategorie", icon: Tags },
        { title: "Objednávky", url: "/admin/objednavky", icon: ShoppingCart },
      ],
    },
    {
      title: "Systém",
      items: [
        { title: "Uživatelé", url: "/admin/users", icon: Users },
      ],
    },
  ],
};
