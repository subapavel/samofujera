import {
  LayoutDashboard,
  Library,
  ShoppingCart,
  UserCog,
  Monitor,
  Trash2,
} from "lucide-react";
import { msg } from "@lingui/core/macro";
import type { SidebarData } from "./types";

export const customerSidebarData: SidebarData = {
  navGroups: [
    {
      title: msg`Obecné`,
      items: [
        { title: msg`Nástěnka`, url: "/muj-ucet", icon: LayoutDashboard },
      ],
    },
    {
      title: msg`Nákupy`,
      items: [
        { title: msg`Knihovna`, url: "/muj-ucet/knihovna", icon: Library },
        { title: msg`Objednávky`, url: "/muj-ucet/objednavky", icon: ShoppingCart },
      ],
    },
    {
      title: msg`Účet`,
      items: [
        { title: msg`Profil`, url: "/muj-ucet/profile", icon: UserCog },
        { title: msg`Aktivní sezení`, url: "/muj-ucet/sessions", icon: Monitor },
        { title: msg`Smazat účet`, url: "/muj-ucet/delete-account", icon: Trash2 },
      ],
    },
  ],
};
