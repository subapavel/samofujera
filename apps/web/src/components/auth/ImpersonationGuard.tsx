"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { t } from "@lingui/core/macro";
import { Eye } from "lucide-react";
import { Button } from "@samofujera/ui";
import { impersonationApi } from "@samofujera/api-client";

interface ImpersonationContextValue {
  active: boolean;
  name: string | null;
  stopImpersonation: () => void;
}

const ImpersonationContext = createContext<ImpersonationContextValue>({
  active: false,
  name: null,
  stopImpersonation: () => {},
});

export function useImpersonation() {
  return useContext(ImpersonationContext);
}

export function ImpersonationProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ active: boolean; name: string | null }>({
    active: false,
    name: null,
  });

  useEffect(() => {
    let cancelled = false;
    impersonationApi
      .getStatus()
      .then((res) => {
        if (!cancelled && res.data.active) {
          setState({ active: true, name: res.data.name });
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const stopImpersonation = useCallback(async () => {
    try {
      await impersonationApi.stop();
      window.location.href = "/admin/users";
    } catch {
      // ignore
    }
  }, []);

  return (
    <ImpersonationContext.Provider
      value={{ active: state.active, name: state.name, stopImpersonation }}
    >
      <div style={state.active ? { ["--impersonation-offset" as string]: "3rem" } : undefined}>
        {children}
      </div>
    </ImpersonationContext.Provider>
  );
}

export function ImpersonationBar() {
  const { active, name, stopImpersonation } = useImpersonation();

  if (!active) return null;

  return (
    <div className="sticky top-0 z-50 flex h-12 items-center border-b border-orange-300 bg-orange-50 px-4">
      <div className="flex flex-1 items-center gap-2 text-sm text-orange-800">
        <Eye className="h-3.5 w-3.5" />
        {t`Prohlížíte jako: ${name ?? ""}`}
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={stopImpersonation}
        className="h-7 text-xs text-orange-800 hover:bg-orange-100"
      >
        {t`Ukončit`}
      </Button>
    </div>
  );
}

