"use client";

import type { ProductsBlock } from "../types";

interface ProductsBlockEditorProps {
  block: ProductsBlock;
  onChange: (block: ProductsBlock) => void;
  onDelete: () => void;
  onCopy: () => void;
  onActiveChange?: (active: boolean) => void;
}

export function ProductsBlockEditor({ block }: ProductsBlockEditorProps) {
  return (
    <div className="products-block">
      <div className="flex items-center justify-center rounded border border-dashed border-gray-300 bg-gray-50 p-8 text-sm text-gray-500">
        Výpis produktů (placeholder)
      </div>
    </div>
  );
}
