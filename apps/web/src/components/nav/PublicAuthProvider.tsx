"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { userApi, impersonationApi } from "@samofujera/api-client";

const hasAnyRole = (roles: string[] | undefined, ...check: string[]) =>
  roles?.some((r) => check.includes(r)) ?? false;

interface ImpersonatingUser {
  id: string;
  name: string;
  email: string;
}

interface PublicAuthState {
  user: { email: string; roles: string[] } | null;
  isAdmin: boolean;
  isEditor: boolean;
  isLoading: boolean;
  hasRole: (role: string) => boolean;
  impersonating: ImpersonatingUser | null;
  stopImpersonation: () => void;
}

const defaultHasRole = () => false;
const defaultStopImpersonation = () => {};

const PublicAuthContext = createContext<PublicAuthState>({
  user: null,
  isAdmin: false,
  isEditor: false,
  isLoading: true,
  hasRole: defaultHasRole,
  impersonating: null,
  stopImpersonation: defaultStopImpersonation,
});

export function usePublicAuth() {
  return useContext(PublicAuthContext);
}

export function PublicAuthProvider({ children }: { children: ReactNode }) {
  const [innerState, setInnerState] = useState<{
    user: { email: string; roles: string[] } | null;
    isAdmin: boolean;
    isEditor: boolean;
    isLoading: boolean;
    impersonating: ImpersonatingUser | null;
  }>({
    user: null,
    isAdmin: false,
    isEditor: false,
    isLoading: true,
    impersonating: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function checkAuth() {
      try {
        const [profileRes, impersonationRes] = await Promise.all([
          userApi.getProfile(),
          impersonationApi.getStatus().catch(() => null),
        ]);
        if (!cancelled) {
          const roles = profileRes.data.roles;
          const imp = impersonationRes?.data;
          setInnerState({
            user: profileRes.data,
            isAdmin: hasAnyRole(roles, "ADMIN", "SUPERADMIN"),
            isEditor: hasAnyRole(roles, "ADMIN", "SUPERADMIN", "EDITOR"),
            isLoading: false,
            impersonating:
              imp?.active && imp.userId && imp.name && imp.email
                ? { id: imp.userId, name: imp.name, email: imp.email }
                : null,
          });
        }
      } catch {
        if (!cancelled) {
          setInnerState({
            user: null,
            isAdmin: false,
            isEditor: false,
            isLoading: false,
            impersonating: null,
          });
        }
      }
    }

    void checkAuth();
    return () => {
      cancelled = true;
    };
  }, []);

  const hasRole = useCallback(
    (role: string) => innerState.user?.roles?.includes(role) ?? false,
    [innerState.user],
  );

  const stopImpersonation = useCallback(async () => {
    try {
      await impersonationApi.stop();
      window.location.href = "/admin";
    } catch {
      // silently ignore — user will stay on current page
    }
  }, []);

  const state: PublicAuthState = {
    ...innerState,
    hasRole,
    stopImpersonation,
  };

  return (
    <PublicAuthContext value={state}>
      {children}
    </PublicAuthContext>
  );
}
