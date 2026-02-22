"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Trash2 } from "lucide-react";
import type { SeparatorBlock, SeparatorMargin } from "../types";

interface SeparatorBlockEditorProps {
  block: SeparatorBlock;
  onChange: (block: SeparatorBlock) => void;
  onDelete: () => void;
  onActiveChange?: (active: boolean) => void;
}

const MARGIN_OPTIONS: { value: SeparatorMargin; label: string }[] = [
  { value: "standard", label: "Standardní" },
  { value: "minimal", label: "Minimální" },
];

export function SeparatorBlockEditor({ block, onChange, onDelete, onActiveChange }: SeparatorBlockEditorProps) {
  const [showToolbar, setShowToolbar] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const separatorClass = block.marginHeight === "minimal" ? "separator-block separator-min" : "separator-block separator-auto";

  // Close toolbar when clicking outside
  useEffect(() => {
    if (!showToolbar) return;
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowToolbar(false);
        setShowDropdown(false);
        onActiveChange?.(false);
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
    <div
      ref={wrapperRef}
      className={`relative cursor-pointer ${separatorClass}`}
      onClick={() => {
        const next = !showToolbar;
        setShowToolbar(next);
        onActiveChange?.(next);
      }}
    >
      {/* Separator line */}
      <hr />

      {/* Floating toolbar */}
      {showToolbar && (
        <div className="absolute left-1/2 -translate-x-1/2 z-50 flex items-center rounded-lg bg-gray-800 px-1 py-1.5 shadow-lg" style={{ bottom: "calc(100% + 8px)" }}>
          {/* Delete button */}
          <button
            type="button"
            className="flex items-center gap-1 rounded px-2 py-1 text-xs text-white/90 transition-colors hover:bg-white/10"
            onClick={(e) => {
              e.stopPropagation();
              setShowToolbar(false);
              setShowDropdown(false);
              onDelete();
            }}
          >
            <Trash2 className="h-3 w-3" />
            Odstranit
          </button>
          <div className="mx-0.5 h-4 w-px bg-white/20" />
          {/* Margin height dropdown */}
          <div className="relative">
            <button
              type="button"
              className="flex items-center gap-1 rounded px-2 py-1 text-xs text-white/90 transition-colors hover:bg-white/10"
              onClick={(e) => {
                e.stopPropagation();
                setShowDropdown(!showDropdown);
              }}
            >
              Výška okraje
              <ChevronDown className="h-3 w-3" />
            </button>

            {showDropdown && (
              <div className="absolute left-0 top-full mt-1 z-50 w-36 rounded-lg border border-gray-600 bg-gray-800 py-1 shadow-lg">
                {MARGIN_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`flex w-full items-center px-3 py-1.5 text-xs transition-colors hover:bg-white/10 ${
                      block.marginHeight === opt.value
                        ? "text-white font-medium"
                        : "text-white/70"
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMarginChange(opt.value);
                    }}
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
