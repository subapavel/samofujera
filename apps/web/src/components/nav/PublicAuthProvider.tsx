"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { userApi } from "@samofujera/api-client";

interface PublicAuthState {
  user: { email: string; role: string } | null;
  isAdmin: boolean;
  isLoading: boolean;
}

const PublicAuthContext = createContext<PublicAuthState>({
  user: null,
  isAdmin: false,
  isLoading: true,
});

export function usePublicAuth() {
  return useContext(PublicAuthContext);
}

export function PublicAuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PublicAuthState>({
    user: null,
    isAdmin: false,
    isLoading: true,
  });

  useEffect(() => {
    let cancelled = false;

    async function checkAuth() {
      try {
        const response = await userApi.getProfile();
        if (!cancelled) {
          setState({
            user: response.data,
            isAdmin: response.data.role === "ADMIN",
            isLoading: false,
          });
        }
      } catch {
        if (!cancelled) {
          setState({ user: null, isAdmin: false, isLoading: false });
        }
      }
    }

    void checkAuth();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <PublicAuthContext value={state}>
      {children}
    </PublicAuthContext>
  );
}
