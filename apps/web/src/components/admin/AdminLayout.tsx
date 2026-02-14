import type { ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { authApi } from "@samofujera/api-client";

const navItems = [
  { label: "Dashboard", to: "/" as const },
  { label: "Users", to: "/users" as const },
] as const;

interface AdminLayoutProps {
  children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  async function handleLogout() {
    try {
      await authApi.logout();
    } finally {
      window.location.href = "/prihlaseni";
    }
  }

  return (
    <div className="flex h-screen bg-[var(--background)] text-[var(--foreground)]">
      {/* Sidebar */}
      <aside className="flex w-64 flex-col border-r border-[var(--border)] bg-[var(--card)]">
        <div className="border-b border-[var(--border)] p-4">
          <a href="/" className="text-lg font-semibold text-[var(--primary)]">Samo Fujera</a>
          <p className="text-xs text-[var(--muted-foreground)]">Administrace</p>
        </div>
        <nav className="flex-1 p-2">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className={`block rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    currentPath === `/admin${item.to === "/" ? "" : item.to}`
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

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 items-center justify-between border-b border-[var(--border)] px-6">
          <span className="text-sm font-medium text-[var(--muted-foreground)]">
            Samo Fujera — Administrace
          </span>
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="rounded-md bg-[var(--secondary)] px-3 py-1.5 text-sm font-medium text-[var(--secondary-foreground)] transition-colors hover:bg-[var(--secondary)]/80"
          >
            Odhlásit se
          </button>
        </header>
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
