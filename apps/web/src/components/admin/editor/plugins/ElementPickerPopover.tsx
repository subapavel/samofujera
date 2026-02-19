"use client";

import { Popover, PopoverContent, PopoverAnchor } from "@samofujera/ui";
import { Type, ImageIcon, Minus, MousePointerClick } from "lucide-react";

export type ElementType = "paragraph" | "image" | "separator" | "button";

interface ElementPickerPopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (type: ElementType) => void;
  anchorStyle: React.CSSProperties;
}

const ELEMENT_OPTIONS: {
  type: ElementType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { type: "paragraph", label: "Text", icon: Type },
  { type: "image", label: "Obr\u00e1zek", icon: ImageIcon },
  { type: "separator", label: "D\u011blic\u00ed \u010d\u00e1ra", icon: Minus },
  { type: "button", label: "Tla\u010d\u00edtko", icon: MousePointerClick },
];

export function ElementPickerPopover({
  open,
  onOpenChange,
  onSelect,
  anchorStyle,
}: ElementPickerPopoverProps) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverAnchor asChild>
        <div style={{ position: "fixed", ...anchorStyle }} />
      </PopoverAnchor>
      <PopoverContent className="w-56 p-3" side="bottom" align="start">
        <p className="mb-2 text-sm font-semibold">P\u0159idat obsah</p>
        <div className="grid grid-cols-2 gap-2">
          {ELEMENT_OPTIONS.map((option) => (
            <button
              key={option.type}
              type="button"
              className="flex flex-col items-center gap-1.5 rounded-lg border border-[var(--border)] p-3 text-xs font-medium transition-colors hover:border-[rgb(6,93,77)] hover:bg-[rgb(6,93,77)]/5"
              onClick={() => {
                onSelect(option.type);
                onOpenChange(false);
              }}
            >
              <option.icon className="h-5 w-5 text-[var(--muted-foreground)]" />
              {option.label}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
