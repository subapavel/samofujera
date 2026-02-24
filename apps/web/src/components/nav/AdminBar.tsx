"use client";

import { useCallback, useSyncExternalStore } from "react";
import Link from "next/link";
import { t } from "@lingui/core/macro";
import { Pencil, LayoutDashboard, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@samofujera/ui";
import { usePublicAuth } from "./PublicAuthProvider";
import { usePageId } from "./PageIdProvider";

const STORAGE_KEY = "adminBarVisible";

// Custom event to sync within same tab (storage event only fires cross-tab)
const SYNC_EVENT = "adminbar-sync";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(SYNC_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(SYNC_EVENT, callback);
  };
}

function getSnapshot(): boolean {
  return localStorage.getItem(STORAGE_KEY) !== "false";
}

function getServerSnapshot(): boolean {
  return true;
}

export function AdminBar() {
  const { isAdmin, isLoading } = usePublicAuth();
  const { pageId } = usePageId();
  const visible = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggleVisibility = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, String(!getSnapshot()));
    window.dispatchEvent(new Event(SYNC_EVENT));
  }, []);

  if (isLoading || !isAdmin) return null;

  // Collapsed state: small toggle button in top-right, same X position as in expanded bar
  if (!visible) {
    return (
      <div className="relative h-0 overflow-visible">
        <button
          type="button"
          onClick={toggleVisibility}
          className="absolute right-4 top-1.5 z-50 flex h-7 w-7 items-center justify-center rounded-md bg-[var(--accent)] text-[var(--foreground)] hover:bg-[var(--border)] transition-colors"
          title={t`Zobrazit admin bar`}
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  // Expanded state: full bar above TopBar
  return (
    <div className="flex h-10 items-center border-b border-[var(--border)] bg-white px-4">
      <div className="flex flex-1 items-center gap-2">
        {pageId && (
          <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" asChild>
            <Link href={`/admin/stranky/${pageId}/edit`}>
              <Pencil className="h-3.5 w-3.5" />
              {t`Upravit stránku`}
            </Link>
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" asChild>
          <Link href="/admin">
            <LayoutDashboard className="h-3.5 w-3.5" />
            {t`Administrace`}
          </Link>
        </Button>

        <button
          type="button"
          onClick={toggleVisibility}
          className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--foreground)] transition-colors"
          title={t`Skrýt admin bar`}
        >
          <ChevronUp className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
