"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { userApi } from "@samofujera/api-client";

const hasAnyRole = (roles: string[] | undefined, ...check: string[]) =>
  roles?.some((r) => check.includes(r)) ?? false;

interface PublicAuthState {
  user: { email: string; roles: string[] } | null;
  isAdmin: boolean;
  isEditor: boolean;
  isLoading: boolean;
  hasRole: (role: string) => boolean;
}

const defaultHasRole = () => false;

const PublicAuthContext = createContext<PublicAuthState>({
  user: null,
  isAdmin: false,
  isEditor: false,
  isLoading: true,
  hasRole: defaultHasRole,
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
  }>({
    user: null,
    isAdmin: false,
    isEditor: false,
    isLoading: true,
  });

  useEffect(() => {
    let cancelled = false;

    async function checkAuth() {
      try {
        const response = await userApi.getProfile();
        if (!cancelled) {
          const roles = response.data.roles;
          setInnerState({
            user: response.data,
            isAdmin: hasAnyRole(roles, "ADMIN", "SUPERADMIN"),
            isEditor: hasAnyRole(roles, "ADMIN", "SUPERADMIN", "EDITOR"),
            isLoading: false,
          });
        }
      } catch {
        if (!cancelled) {
          setInnerState({
            user: null,
            isAdmin: false,
            isEditor: false,
            isLoading: false,
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

  const state: PublicAuthState = {
    ...innerState,
    hasRole,
  };

  return (
    <PublicAuthContext value={state}>
      {children}
    </PublicAuthContext>
  );
}
