"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { userApi } from "@samofujera/api-client";

interface AuthGuardProps {
  children: ReactNode;
  requiredRole?: string;
}

export function AuthGuard({ children, requiredRole }: AuthGuardProps) {
  const [state, setState] = useState<"loading" | "authenticated" | "redirecting">("loading");
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function checkAuth() {
      try {
        const response = await userApi.getProfile();
        if (!cancelled) {
          if (requiredRole && response.data.role !== requiredRole) {
            setState("redirecting");
            router.push("/muj-ucet");
          } else {
            setState("authenticated");
          }
        }
      } catch {
        if (!cancelled) {
          setState("redirecting");
          sessionStorage.setItem("redirectAfterLogin", pathname);
          router.push("/prihlaseni");
        }
      }
    }

    void checkAuth();
    return () => { cancelled = true; };
  }, [requiredRole, pathname, router]);

  if (state === "loading") {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-sm text-[var(--muted-foreground)]">Nacitani...</div>
      </div>
    );
  }

  if (state === "redirecting") {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-sm text-[var(--muted-foreground)]">Presmerovani...</div>
      </div>
    );
  }

  return <>{children}</>;
}
