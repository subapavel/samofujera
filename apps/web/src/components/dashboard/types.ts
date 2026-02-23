import type React from "react";
import type { MessageDescriptor } from "@lingui/core";

type BaseNavItem = {
  title: MessageDescriptor;
  badge?: string;
  icon?: React.ElementType;
};

export type NavLink = BaseNavItem & {
  url: string;
  items?: never;
};

export type NavCollapsible = BaseNavItem & {
  items: (BaseNavItem & { url: string })[];
  url?: never;
};

export type NavItem = NavCollapsible | NavLink;

export type NavGroup = {
  title: MessageDescriptor;
  items: NavItem[];
};

export type SidebarData = {
  navGroups: NavGroup[];
};
