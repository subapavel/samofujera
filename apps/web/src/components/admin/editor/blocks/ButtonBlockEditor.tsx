"use client";

import { useState } from "react";
import type { ButtonBlock, ButtonVariant } from "../types";

interface ButtonBlockEditorProps {
  block: ButtonBlock;
  onChange: (block: ButtonBlock) => void;
}

export function ButtonBlockEditor({ block, onChange }: ButtonBlockEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(block.text);
  const [editUrl, setEditUrl] = useState(block.url);
  const [editVariant, setEditVariant] = useState(block.variant);

  function handleSave() {
    onChange({ ...block, text: editText, url: editUrl, variant: editVariant });
    setIsEditing(false);
  }

  const variantClasses: Record<ButtonVariant, string> = {
    primary:
      "bg-[rgb(6,93,77)] text-white hover:bg-[rgb(5,78,64)] px-8 py-3 rounded-lg font-semibold text-lg inline-block",
    secondary:
      "border-2 border-[rgb(6,93,77)] text-[rgb(6,93,77)] hover:bg-[rgb(6,93,77)] hover:text-white px-8 py-3 rounded-lg font-semibold text-lg inline-block",
  };

  if (isEditing) {
    return (
      <div className="mx-auto max-w-sm space-y-2 rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
        <input
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          placeholder="Text tlačítka"
          className="w-full rounded border border-[var(--border)] px-3 py-1.5 text-sm"
        />
        <input
          value={editUrl}
          onChange={(e) => setEditUrl(e.target.value)}
          placeholder="URL odkazu"
          className="w-full rounded border border-[var(--border)] px-3 py-1.5 text-sm"
        />
        <div className="flex gap-2">
          <button
            className={`flex-1 rounded px-2 py-1 text-xs ${editVariant === "primary" ? "bg-[rgb(6,93,77)] text-white" : "border"}`}
            onClick={() => setEditVariant("primary")}
          >
            Primární
          </button>
          <button
            className={`flex-1 rounded px-2 py-1 text-xs ${editVariant === "secondary" ? "bg-[rgb(6,93,77)] text-white" : "border"}`}
            onClick={() => setEditVariant("secondary")}
          >
            Sekundární
          </button>
        </div>
        <div className="flex justify-end gap-2">
          <button className="rounded px-3 py-1 text-xs text-[var(--muted-foreground)]" onClick={() => setIsEditing(false)}>
            Zrušit
          </button>
          <button className="rounded bg-[rgb(6,93,77)] px-3 py-1 text-xs text-white" onClick={handleSave}>
            Uložit
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="text-center">
      <span
        className={`cursor-pointer ${variantClasses[block.variant]}`}
        onClick={() => {
          setEditText(block.text);
          setEditUrl(block.url);
          setEditVariant(block.variant);
          setIsEditing(true);
        }}
      >
        {block.text || "Klikni pro úpravu tlačítka"}
      </span>
    </div>
  );
}
