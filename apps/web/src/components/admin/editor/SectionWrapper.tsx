"use client";

import { useState, type ReactNode } from "react";
import { Trash2 } from "lucide-react";

interface SectionWrapperProps {
  sectionId: string;
  onDelete: () => void;
  children: ReactNode;
}

export function SectionWrapper({ sectionId, onDelete, children }: SectionWrapperProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="group relative transition-all duration-200"
      data-section-id={sectionId}
      style={{
        outline: hovered ? "1px solid rgba(6,93,77,0.3)" : "1px solid transparent",
        outlineOffset: "4px",
        borderRadius: "4px",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {children}
      {/* Delete button — top right, visible on hover */}
      {hovered && (
        <button
          type="button"
          className="absolute -top-3 -right-3 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-white shadow-md transition-colors hover:bg-red-600"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          title="Smazat sekci"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
