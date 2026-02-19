"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

interface SectionAddButtonProps {
  onAdd: () => void;
}

export function SectionAddButton({ onAdd }: SectionAddButtonProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="relative flex h-8 items-center justify-center"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Thick horizontal line */}
      <div
        className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 bg-[rgb(6,93,77)] transition-opacity duration-200"
        style={{ opacity: hovered ? 1 : 0 }}
      />
      {/* Big + circle */}
      <button
        type="button"
        className="relative z-10 flex h-9 w-9 items-center justify-center rounded-full border-2 border-[rgb(6,93,77)] bg-white text-[rgb(6,93,77)] transition-all duration-200 hover:bg-[rgb(6,93,77)] hover:text-white"
        style={{ opacity: hovered ? 1 : 0.3 }}
        onClick={onAdd}
        title="Přidat sekci"
      >
        <Plus className="h-5 w-5" />
      </button>
    </div>
  );
}
