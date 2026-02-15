import { useEffect, useState } from "react";
import { userApi } from "@samofujera/api-client";

interface AuthState {
  authenticated: boolean;
  role?: string;
}

export function TopBar() {
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
    return () => {
      cancelled = true;
    };
  }, []);

  const linkClass =
    "text-xs uppercase tracking-wider text-white/80 hover:text-white transition-colors";

  return (
    <div className="bg-[var(--primary)] text-white text-xs py-1.5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-end gap-4">
        {auth === null ? (
          <span className="h-4" />
        ) : auth.authenticated ? (
          <>
            {auth.role === "ADMIN" && (
              <a href="/admin" className={linkClass}>
                Administrace
              </a>
            )}
            <a href="/muj-ucet" className={linkClass}>
              Můj účet
            </a>
          </>
        ) : (
          <>
            <a href="/prihlaseni" className={linkClass}>
              Přihlášení
            </a>
            <span className="text-white/40">|</span>
            <a href="/registrace" className={linkClass}>
              Registrace
            </a>
          </>
        )}
      </div>
    </div>
  );
}
