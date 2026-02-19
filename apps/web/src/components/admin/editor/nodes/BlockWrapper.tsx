"use client";

import type { ReactNode } from "react";
import { $getNodeByKey, type LexicalEditor, type NodeKey } from "lexical";
import { Trash2 } from "lucide-react";

interface BlockWrapperProps {
  nodeKey: NodeKey;
  editor: LexicalEditor;
  isSelected: boolean;
  onSelect: () => void;
  children: ReactNode;
  className?: string;
}

export function BlockWrapper({
  nodeKey,
  editor,
  isSelected,
  onSelect,
  children,
  className = "",
}: BlockWrapperProps) {
  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    editor.update(() => {
      const node = $getNodeByKey(nodeKey);
      if (node) {
        node.remove();
      }
    });
  }

  return (
    <div
      className={`relative ${isSelected ? "ring-2 ring-[rgb(6,93,77)] ring-offset-2 rounded" : ""} ${className}`}
      onClick={onSelect}
    >
      {children}
      {isSelected && (
        <button
          type="button"
          className="absolute -top-3 -right-3 z-20 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow-md hover:bg-red-600"
          onClick={handleDelete}
          title="Smazat blok"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
