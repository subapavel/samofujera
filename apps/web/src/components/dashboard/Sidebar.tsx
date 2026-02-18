"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const adminNavItems = [
  { label: "Dashboard", href: "/admin" },
  { label: "Users", href: "/admin/users" },
  { label: "Produkty", href: "/admin/produkty" },
  { label: "Kategorie", href: "/admin/produkty/kategorie" },
  { label: "Stranky", href: "/admin/stranky" },
  { label: "Media", href: "/admin/media" },
  { label: "Objednavky", href: "/admin/objednavky" },
];

const customerNavItems = [
  { label: "Dashboard", href: "/muj-ucet" },
  { label: "Knihovna", href: "/muj-ucet/knihovna" },
  { label: "Objednavky", href: "/muj-ucet/objednavky" },
  { label: "Profil", href: "/muj-ucet/profile" },
  { label: "Aktivni sezeni", href: "/muj-ucet/sessions" },
  { label: "Smazat ucet", href: "/muj-ucet/delete-account" },
];

export function Sidebar() {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");
  const navItems = isAdmin ? adminNavItems : customerNavItems;
  const sectionLabel = isAdmin ? "Administrace" : "Muj ucet";

  function isActive(href: string) {
    const basePath = isAdmin ? "/admin" : "/muj-ucet";
    if (href === basePath) {
      return pathname === basePath || pathname === `${basePath}/`;
    }
    return pathname.startsWith(href);
  }

  return (
    <aside className="flex w-64 flex-col border-r border-[var(--border)] bg-[var(--card)]">
      <div className="border-b border-[var(--border)] p-4">
        <Link href="/" className="text-lg font-semibold text-[var(--primary)]">
          Samo Fujera
        </Link>
        <p className="text-xs text-[var(--muted-foreground)]">{sectionLabel}</p>
      </div>
      <nav className="flex-1 p-2">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`block rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive(item.href)
                    ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                    : "text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]"
                }`}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
