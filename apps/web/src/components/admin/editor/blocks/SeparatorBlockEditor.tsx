"use client";

import type { SeparatorBlock, SeparatorStyle } from "../types";

interface SeparatorBlockEditorProps {
  block: SeparatorBlock;
  onChange: (block: SeparatorBlock) => void;
}

export function SeparatorBlockEditor({ block, onChange }: SeparatorBlockEditorProps) {
  function toggleStyle() {
    const newStyle: SeparatorStyle = block.separatorStyle === "simple" ? "ornamental" : "simple";
    onChange({ ...block, separatorStyle: newStyle });
  }

  return (
    <div className="cursor-pointer" onDoubleClick={toggleStyle}>
      {block.separatorStyle === "simple" ? (
        <hr className="border-t border-[var(--border)]" />
      ) : (
        <div className="flex items-center justify-center gap-3">
          <div className="h-px flex-1 bg-[rgb(6,93,77)]/30" />
          <span className="text-[rgb(6,93,77)]">&#10043;</span>
          <div className="h-px flex-1 bg-[rgb(6,93,77)]/30" />
        </div>
      )}
      <p className="mt-1 text-center text-xs text-[var(--muted-foreground)]">
        Dvakrát klikni pro změnu stylu
      </p>
    </div>
  );
}
