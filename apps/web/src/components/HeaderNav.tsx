import { useEffect, useState } from "react";
import { userApi, ApiError } from "@samofujera/api-client";

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
      } catch (error) {
        if (!cancelled) {
          setAuth({ authenticated: false });
        }
      }
    }

    void checkAuth();
    return () => { cancelled = true; };
  }, []);

  // Show nothing while loading to avoid flash
  if (auth === null) {
    return <nav className="flex items-center gap-6" />;
  }

  if (auth.authenticated) {
    return (
      <nav className="flex items-center gap-6">
        {auth.role === "ADMIN" && (
          <a
            href="/admin"
            className="text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
          >
            Administrace
          </a>
        )}
        <a
          href="/muj-ucet"
          className="text-sm font-medium text-[var(--primary-foreground)] bg-[var(--primary)] hover:bg-[var(--primary)]/90 px-4 py-2 rounded-md transition-colors"
        >
          Můj účet
        </a>
      </nav>
    );
  }

  return (
    <nav className="flex items-center gap-6">
      <a
        href="/prihlaseni"
        className="text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
      >
        Přihlášení
      </a>
      <a
        href="/registrace"
        className="text-sm font-medium text-[var(--primary-foreground)] bg-[var(--primary)] hover:bg-[var(--primary)]/90 px-4 py-2 rounded-md transition-colors"
      >
        Registrace
      </a>
    </nav>
  );
}
