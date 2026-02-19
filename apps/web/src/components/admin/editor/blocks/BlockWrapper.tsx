"use client";

import { useState, useCallback, useRef, type ReactNode } from "react";
import { Plus } from "lucide-react";
import {
  ElementPickerPopover,
  type ElementType,
} from "../plugins/ElementPickerPopover";

interface BlockWrapperProps {
  children: ReactNode;
  isActive?: boolean;
  onAddBefore: (type: ElementType) => void;
  onAddAfter: (type: ElementType) => void;
}

export function BlockWrapper({
  children,
  isActive,
  onAddBefore,
  onAddAfter,
}: BlockWrapperProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [edgePosition, setEdgePosition] = useState<"top" | "bottom" | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerEdge, setPickerEdge] = useState<"top" | "bottom">("bottom");
  const [pickerAnchorRect, setPickerAnchorRect] = useState<DOMRect | null>(null);

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

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
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

  // Active (editing) → always solid border. Hover at edge → hide dashed border (line replaces it).
  const showEdge = isHovered && edgePosition !== null && !pickerOpen;
  const showBorder = isActive || (isHovered && !showEdge);
  const borderClass = isActive
    ? "border-solid border-[rgb(6,93,77)]/60"
    : "border-dashed border-[rgb(6,93,77)]/40";

  return (
    <div
      ref={wrapperRef}
      className={`relative rounded-md border-2 p-4 transition-colors ${
        showBorder ? borderClass : "border-transparent"
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
    >
      {children}

      {/* Top edge: line + plus button (line only when not active/editing) */}
      {isHovered && edgePosition === "top" && !pickerOpen && (
        <div className="absolute left-0 right-0 top-0 flex -translate-y-1/2 items-center px-2">
          <button
            type="button"
            className="z-10 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[rgb(6,93,77)] bg-white text-[rgb(6,93,77)] transition-colors hover:bg-[rgb(6,93,77)] hover:text-white"
            onClick={() => handlePlusClick("top")}
          >
            <Plus className="h-3 w-3" />
          </button>
          {!isActive && (
            <div className="h-px flex-1 border-t border-dashed border-[rgb(6,93,77)]/60" />
          )}
        </div>
      )}

      {/* Bottom edge: line + plus button (line only when not active/editing) */}
      {isHovered && edgePosition === "bottom" && !pickerOpen && (
        <div className="absolute bottom-0 left-0 right-0 flex translate-y-1/2 items-center px-2">
          <button
            type="button"
            className="z-10 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[rgb(6,93,77)] bg-white text-[rgb(6,93,77)] transition-colors hover:bg-[rgb(6,93,77)] hover:text-white"
            onClick={() => handlePlusClick("bottom")}
          >
            <Plus className="h-3 w-3" />
          </button>
          {!isActive && (
            <div className="h-px flex-1 border-t border-dashed border-[rgb(6,93,77)]/60" />
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
