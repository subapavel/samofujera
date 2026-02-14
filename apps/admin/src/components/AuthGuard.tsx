import { useEffect, useState, type ReactNode } from "react";
import { userApi, ApiError } from "@samofujera/api-client";

const LOGIN_URL = "http://localhost:4321/prihlaseni";

interface AuthGuardProps {
  children: ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const [state, setState] = useState<"loading" | "authenticated" | "redirecting">("loading");

  useEffect(() => {
    let cancelled = false;

    async function checkAuth() {
      try {
        await userApi.getProfile();
        if (!cancelled) {
          setState("authenticated");
        }
      } catch (error) {
        if (!cancelled) {
          if (error instanceof ApiError && error.status === 401) {
            setState("redirecting");
            window.location.href = LOGIN_URL;
          } else {
            setState("redirecting");
            window.location.href = LOGIN_URL;
          }
        }
      }
    }

    void checkAuth();

    return () => {
      cancelled = true;
    };
  }, []);

  if (state === "loading") {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground text-sm">Loading...</div>
      </div>
    );
  }

  if (state === "redirecting") {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground text-sm">Redirecting to login...</div>
      </div>
    );
  }

  return <>{children}</>;
}
