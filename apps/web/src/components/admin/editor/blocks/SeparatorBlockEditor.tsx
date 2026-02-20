"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import type { SeparatorBlock, SeparatorMargin } from "../types";

interface SeparatorBlockEditorProps {
  block: SeparatorBlock;
  onChange: (block: SeparatorBlock) => void;
}

const MARGIN_OPTIONS: { value: SeparatorMargin; label: string }[] = [
  { value: "standard", label: "Standardní" },
  { value: "minimal", label: "Minimální" },
];

export function SeparatorBlockEditor({ block, onChange }: SeparatorBlockEditorProps) {
  const [showToolbar, setShowToolbar] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const paddingClass = block.marginHeight === "minimal" ? "py-[0.625rem]" : "py-8";

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

  const showOutline = isHovered || showToolbar;
  const borderStyle = showOutline
    ? showToolbar
      ? "1px solid rgba(0,0,0,0.6)"
      : "1px dashed rgba(0,0,0,0.4)"
    : "1px solid transparent";

  return (
    <div
      ref={wrapperRef}
      className={`relative cursor-pointer ${paddingClass}`}
      style={{
        width: "calc(100% + 12rem)",
        marginLeft: "-6rem",
        paddingLeft: "6rem",
        paddingRight: "6rem",
        border: borderStyle,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        if (!showToolbar) {
          setShowDropdown(false);
        }
      }}
      onClick={() => setShowToolbar(!showToolbar)}
    >
      {/* Separator line */}
      <hr />

      {/* Floating toolbar */}
      {showToolbar && (
        <div className="absolute left-1/2 -translate-x-1/2 -top-10 z-50 flex items-center gap-1 rounded-lg bg-gray-800 px-2 py-1.5 shadow-lg">
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
