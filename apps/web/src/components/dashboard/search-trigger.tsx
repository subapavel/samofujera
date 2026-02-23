"use client";

import { useMemo } from "react";
import { Search } from "lucide-react";
import { Button } from "@samofujera/ui";
import { t } from "@lingui/core/macro";
import { useSearch } from "./search-provider";

export function SearchTrigger() {
  const { setOpen } = useSearch();
  const isMac = useMemo(
    () => typeof navigator !== "undefined" && navigator.platform.toUpperCase().includes("MAC"),
    [],
  );

  return (
    <Button
      variant="outline"
      className="relative h-8 w-40 justify-start rounded-md bg-muted/25 text-sm font-normal text-muted-foreground shadow-none hover:bg-accent sm:pr-12 lg:w-52"
      onClick={() => setOpen(true)}
    >
      <Search className="mr-2 h-4 w-4" />
      <span>{t`Hledat...`}</span>
      <kbd className="pointer-events-none absolute right-[0.3rem] top-[0.3rem] hidden h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium select-none sm:flex">
        <span className="text-xs">{isMac ? "\u2318" : "Ctrl"}</span>K
      </kbd>
    </Button>
  );
}
