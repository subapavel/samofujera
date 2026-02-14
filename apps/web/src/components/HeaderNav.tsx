import { useEffect, useState } from "react";
import { userApi } from "@samofujera/api-client";

interface AuthState {
  authenticated: boolean;
  role?: string;
}

export function HeaderNav() {
  const [auth, setAuth] = useState<AuthState | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function checkAuth() {
      try {
        const response = await userApi.getProfile();
        if (!cancelled) {
          setAuth({ authenticated: true, role: response.data.role });
        }
      } catch {
        if (!cancelled) {
          setAuth({ authenticated: false });
        }
      }
    }

    void checkAuth();
    return () => { cancelled = true; };
  }, []);

  const linkClass = "text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors";
  const btnClass = "text-xs font-medium uppercase tracking-wider text-[var(--primary-foreground)] bg-[var(--primary)] hover:opacity-90 px-4 py-2 rounded-sm transition-colors";

  if (auth === null) {
    return <nav className="flex items-center gap-6" />;
  }

  if (auth.authenticated) {
    return (
      <nav className="flex items-center gap-6">
        {auth.role === "ADMIN" && (
          <a href="/admin" className={linkClass}>
            Administrace
          </a>
        )}
        <a href="/muj-ucet" className={btnClass}>
          Můj účet
        </a>
      </nav>
    );
  }

  return (
    <nav className="flex items-center gap-6">
      <a href="/prihlaseni" className={linkClass}>
        Přihlášení
      </a>
      <a href="/registrace" className={btnClass}>
        Registrace
      </a>
    </nav>
  );
}
