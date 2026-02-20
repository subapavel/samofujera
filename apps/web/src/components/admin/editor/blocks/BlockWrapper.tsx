"use client";

import { useState, useCallback, useRef, useEffect, type ReactNode } from "react";
import { Check, MapPinPlusInside, Trash2, X } from "lucide-react";
import {
  ElementPickerPopover,
  type ElementType,
} from "../plugins/ElementPickerPopover";

interface BlockWrapperProps {
  children: ReactNode;
  isActive?: boolean;
  onDelete: () => void;
  onAddBefore: (type: ElementType) => void;
  onAddAfter: (type: ElementType) => void;
}

export function BlockWrapper({
  children,
  isActive,
  onDelete,
  onAddBefore,
  onAddAfter,
}: BlockWrapperProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [edgePosition, setEdgePosition] = useState<"top" | "bottom" | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerEdge, setPickerEdge] = useState<"top" | "bottom">("bottom");
  const [pickerAnchorRect, setPickerAnchorRect] = useState<DOMRect | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (pickerOpen) return;
      const rect = wrapperRef.current?.getBoundingClientRect();
      if (!rect) return;
      const relativeY = (e.clientY - rect.top) / rect.height;
      if (relativeY < 0.2) {
        setEdgePosition("top");
      } else if (relativeY > 0.8) {
        setEdgePosition("bottom");
      } else {
        setEdgePosition(null);
      }
    },
    [pickerOpen],
  );

  // Auto-dismiss delete confirmation after 3s
  useEffect(() => {
    if (!confirmingDelete) return;
    const timer = setTimeout(() => setConfirmingDelete(false), 3000);
    return () => clearTimeout(timer);
  }, [confirmingDelete]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    setConfirmingDelete(false);
    if (!pickerOpen) {
      setEdgePosition(null);
    }
  }, [pickerOpen]);

  const handlePlusClick = useCallback((edge: "top" | "bottom") => {
    setPickerEdge(edge);
    setPickerAnchorRect(wrapperRef.current?.getBoundingClientRect() ?? null);
    setPickerOpen(true);
  }, []);

  const handleInsertElement = useCallback(
    (type: ElementType) => {
      if (pickerEdge === "top") {
        onAddBefore(type);
      } else {
        onAddAfter(type);
      }
      setPickerOpen(false);
      setEdgePosition(null);
    },
    [pickerEdge, onAddBefore, onAddAfter],
  );

  // Active (editing) → always solid outline. Hover at edge → hide dashed outline (line replaces it).
  const showEdge = isHovered && edgePosition !== null && !pickerOpen;
  const showOutline = isActive || (isHovered && !showEdge);
  const widerStyle = {
    width: "calc(100% + 12rem)",
    marginLeft: "-6rem",
    paddingLeft: "6rem",
    paddingRight: "6rem",
  };
  const borderStyle = showOutline
    ? isActive
      ? "1px solid rgba(0,0,0,0.6)"
      : "1px dashed rgba(0,0,0,0.4)"
    : "1px solid transparent";

  return (
    <div
      ref={wrapperRef}
      className="relative"
      style={{
        ...widerStyle,
        border: borderStyle,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
    >
      {children}

      {/* Delete button with inline confirmation — top right */}
      {(isActive || isHovered) && !confirmingDelete && (
        <button
          type="button"
          className="absolute -top-3 -right-3 z-20 flex h-6 w-6 items-center justify-center rounded-full border border-red-300 bg-white text-red-500 transition-colors hover:bg-red-500 hover:text-white"
          onClick={() => setConfirmingDelete(true)}
          title="Odstranit blok"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      )}
      {confirmingDelete && (
        <div className="absolute -top-4 -right-3 z-20 flex items-center gap-1 rounded-full border border-red-300 bg-white px-2 py-1 shadow-md">
          <span className="text-xs font-medium text-red-600">Smazat?</span>
          <button
            type="button"
            className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white transition-colors hover:bg-red-700"
            onClick={() => {
              setConfirmingDelete(false);
              onDelete();
            }}
            title="Potvrdit smazání"
          >
            <Check className="h-3 w-3" />
          </button>
          <button
            type="button"
            className="flex h-5 w-5 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-500 transition-colors hover:bg-gray-100"
            onClick={() => setConfirmingDelete(false)}
            title="Zrušit"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Top edge: pin icon + dashed line (line only when not active/editing) */}
      {isHovered && edgePosition === "top" && !pickerOpen && (
        <div
          className="absolute inset-x-0 top-0 flex -translate-y-1/2 items-center"
        >
          <button
            type="button"
            className="z-10 flex shrink-0 items-center justify-center text-black/60 transition-colors hover:text-black"
            style={{ marginLeft: "-2rem" }}
            onClick={() => handlePlusClick("top")}
          >
            <MapPinPlusInside className="h-8 w-8 -rotate-90" strokeWidth={0.5} />
          </button>
          {!isActive && (
            <div className="h-px flex-1 border-t border-dashed border-black/60" />
          )}
        </div>
      )}

      {/* Bottom edge: pin icon + dashed line (line only when not active/editing) */}
      {isHovered && edgePosition === "bottom" && !pickerOpen && (
        <div
          className="absolute inset-x-0 bottom-0 flex translate-y-1/2 items-center"
        >
          <button
            type="button"
            className="z-10 flex shrink-0 items-center justify-center text-black/60 transition-colors hover:text-black"
            style={{ marginLeft: "-2rem" }}
            onClick={() => handlePlusClick("bottom")}
          >
            <MapPinPlusInside className="h-8 w-8 -rotate-90" strokeWidth={0.5} />
          </button>
          {!isActive && (
            <div className="h-px flex-1 border-t border-dashed border-black/60" />
          )}
        </div>
      )}

      {/* Element picker popover */}
      {pickerOpen && pickerAnchorRect && (
        <ElementPickerPopover
          open={pickerOpen}
          onOpenChange={(open) => {
            setPickerOpen(open);
            if (!open) {
              setEdgePosition(null);
              setPickerAnchorRect(null);
            }
          }}
          onSelect={handleInsertElement}
          anchorStyle={{
            top: pickerEdge === "top" ? pickerAnchorRect.top : pickerAnchorRect.bottom,
            left: pickerAnchorRect.left,
          }}
        />
      )}
    </div>
  );
}
