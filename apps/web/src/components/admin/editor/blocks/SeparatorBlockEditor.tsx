"use client";

import { useState, useRef, useEffect } from "react";
import { Trash2, ChevronDown } from "lucide-react";
import type { SeparatorBlock, SeparatorMargin } from "../types";

interface SeparatorBlockEditorProps {
  block: SeparatorBlock;
  onChange: (block: SeparatorBlock) => void;
  onDelete: () => void;
}

const MARGIN_OPTIONS: { value: SeparatorMargin; label: string }[] = [
  { value: "standard", label: "Standardní" },
  { value: "minimal", label: "Minimální" },
];

export function SeparatorBlockEditor({ block, onChange, onDelete }: SeparatorBlockEditorProps) {
  const [showToolbar, setShowToolbar] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const marginClass = block.marginHeight === "minimal" ? "my-2" : "my-8";

  // Close toolbar when clicking outside
  useEffect(() => {
    if (!showToolbar) return;
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowToolbar(false);
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showToolbar]);

  function handleMarginChange(margin: SeparatorMargin) {
    onChange({ ...block, marginHeight: margin });
    setShowDropdown(false);
  }

  return (
    <div ref={wrapperRef} className="relative">
      {/* Separator line */}
      <div
        className={`${marginClass} cursor-pointer`}
        onClick={() => setShowToolbar(!showToolbar)}
      >
        <hr className="border-t border-[var(--border)]" />
      </div>

      {/* Floating toolbar */}
      {showToolbar && (
        <div
          ref={toolbarRef}
          className="absolute left-1/2 -translate-x-1/2 -top-10 z-30 flex items-center gap-1 rounded-lg bg-gray-800 px-2 py-1.5 shadow-lg"
        >
          {/* Delete button */}
          <button
            type="button"
            className="flex items-center gap-1.5 rounded px-2 py-1 text-xs text-white/90 transition-colors hover:bg-white/10"
            onClick={() => {
              setShowToolbar(false);
              onDelete();
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Odstranit
          </button>

          {/* Divider */}
          <div className="mx-0.5 h-5 w-px bg-white/20" />

          {/* Margin height dropdown */}
          <div className="relative">
            <button
              type="button"
              className="flex items-center gap-1 rounded px-2 py-1 text-xs text-white/90 transition-colors hover:bg-white/10"
              onClick={() => setShowDropdown(!showDropdown)}
            >
              Výška okraje
              <ChevronDown className="h-3 w-3" />
            </button>

            {showDropdown && (
              <div className="absolute left-0 top-full mt-1 w-36 rounded-lg border border-gray-600 bg-gray-800 py-1 shadow-lg">
                {MARGIN_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`flex w-full items-center px-3 py-1.5 text-xs transition-colors hover:bg-white/10 ${
                      block.marginHeight === opt.value
                        ? "text-white font-medium"
                        : "text-white/70"
                    }`}
                    onClick={() => handleMarginChange(opt.value)}
                  >
                    {block.marginHeight === opt.value && (
                      <span className="mr-2">✓</span>
                    )}
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Arrow pointer */}
          <div className="absolute left-1/2 -bottom-1.5 -translate-x-1/2 h-0 w-0 border-x-[6px] border-t-[6px] border-x-transparent border-t-gray-800" />
        </div>
      )}
    </div>
  );
}
