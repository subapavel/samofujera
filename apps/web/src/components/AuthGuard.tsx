import { useEffect, useState, type ReactNode } from "react";
import { userApi, ApiError } from "@samofujera/api-client";

interface AuthGuardProps {
  children: ReactNode;
  requiredRole?: string;
}

export function AuthGuard({ children, requiredRole }: AuthGuardProps) {
  const [state, setState] = useState<"loading" | "authenticated" | "redirecting">("loading");

  useEffect(() => {
    let cancelled = false;

    async function checkAuth() {
      try {
        const response = await userApi.getProfile();
        if (!cancelled) {
          if (requiredRole && response.data.role !== requiredRole) {
            setState("redirecting");
            window.location.href = "/muj-ucet";
          } else {
            setState("authenticated");
          }
        }
      } catch (error) {
        if (!cancelled) {
          setState("redirecting");
          sessionStorage.setItem("redirectAfterLogin", window.location.pathname);
          window.location.href = "/prihlaseni";
        }
      }
    }

    void checkAuth();

    return () => {
      cancelled = true;
    };
  }, [requiredRole]);

  if (state === "loading") {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-sm text-[var(--muted-foreground)]">Načítání...</div>
      </div>
    );
  }

  if (state === "redirecting") {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-sm text-[var(--muted-foreground)]">Přesměrování...</div>
      </div>
    );
  }

  return <>{children}</>;
}
