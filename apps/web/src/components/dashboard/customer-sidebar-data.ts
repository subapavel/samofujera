import {
  LayoutDashboard,
  Library,
  ShoppingCart,
  UserCog,
  Monitor,
  Trash2,
} from "lucide-react";
import type { SidebarData } from "./types";

export const customerSidebarData: SidebarData = {
  navGroups: [
    {
      title: "Obecné",
      items: [
        { title: "Nástěnka", url: "/muj-ucet", icon: LayoutDashboard },
      ],
    },
    {
      title: "Nákupy",
      items: [
        { title: "Knihovna", url: "/muj-ucet/knihovna", icon: Library },
        { title: "Objednávky", url: "/muj-ucet/objednavky", icon: ShoppingCart },
      ],
    },
    {
      title: "Účet",
      items: [
        { title: "Profil", url: "/muj-ucet/profile", icon: UserCog },
        { title: "Aktivní sezení", url: "/muj-ucet/sessions", icon: Monitor },
        { title: "Smazat účet", url: "/muj-ucet/delete-account", icon: Trash2 },
      ],
    },
  ],
};
