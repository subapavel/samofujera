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
  { type: "image", label: "Obrázek", icon: ImageIcon },
  { type: "separator", label: "Dělicí čára", icon: Minus },
  { type: "button", label: "Tlačítko", icon: MousePointerClick },
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
      <PopoverContent className="w-56 border-gray-700 bg-gray-800 p-3 shadow-lg" side="bottom" align="start">
        <p className="mb-2 text-sm font-semibold" style={{ color: "white" }}>Přidat obsah</p>
        <div className="grid grid-cols-2 gap-2">
          {ELEMENT_OPTIONS.map((option) => (
            <button
              key={option.type}
              type="button"
              className="flex flex-col items-center gap-1.5 rounded-lg border border-gray-600 p-3 text-xs font-medium transition-colors hover:border-white/40 hover:bg-white/10"
              style={{ color: "white" }}
              onClick={() => {
                onSelect(option.type);
                onOpenChange(false);
              }}
            >
              <option.icon className="h-5 w-5 text-white/60" />
              {option.label}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
