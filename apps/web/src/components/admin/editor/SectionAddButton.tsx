"use client";

import { useState } from "react";
import { Plus, LayoutTemplate } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@samofujera/ui";

interface SectionAddButtonProps {
  onAdd: () => void;
}

export function SectionAddButton({ onAdd }: SectionAddButtonProps) {
  const [hovered, setHovered] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);

  const active = hovered || popoverOpen;

  return (
    <div
      className="relative flex h-8 items-center justify-center"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Thick horizontal line */}
      <div
        className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 bg-[rgb(6,93,77)] transition-opacity duration-200"
        style={{ opacity: active ? 1 : 0 }}
      />
      {/* Big + circle with popover */}
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="relative z-10 flex h-9 w-9 items-center justify-center rounded-full border-2 border-[rgb(6,93,77)] bg-white text-[rgb(6,93,77)] transition-all duration-200 hover:bg-[rgb(6,93,77)] hover:text-white"
            style={{ opacity: active ? 1 : 0.3 }}
            title="Přidat sekci"
          >
            <Plus className="h-5 w-5" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-3" side="bottom" align="center">
          <p className="mb-2 text-sm font-semibold">Přidat sekci</p>
          <div className="grid grid-cols-1 gap-2">
            <button
              type="button"
              className="flex items-center gap-3 rounded-lg border border-[var(--border)] p-3 text-sm font-medium transition-colors hover:border-[rgb(6,93,77)] hover:bg-[rgb(6,93,77)]/5"
              onClick={() => {
                onAdd();
                setPopoverOpen(false);
              }}
            >
              <LayoutTemplate className="h-5 w-5 text-[var(--muted-foreground)]" />
              Výchozí
            </button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
