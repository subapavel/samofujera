"use client";

import { useState, useCallback, useRef, useEffect, type ReactNode } from "react";
import { MapPinPlusInside } from "lucide-react";
import {
  ElementPickerPopover,
  type ElementType,
} from "../plugins/ElementPickerPopover";

interface BlockWrapperProps {
  children: ReactNode | ((requestDelete: () => void) => ReactNode);
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
  const borderStyle = confirmingDelete
    ? "1px solid rgba(239,68,68,0.8)"
    : showOutline
      ? isActive
        ? "1px solid rgba(0,0,0,0.6)"
        : "1px dashed rgba(0,0,0,0.4)"
      : "1px solid transparent";

  const requestDelete = useCallback(() => setConfirmingDelete(true), []);

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
      {typeof children === "function" ? children(requestDelete) : children}

      {/* Delete confirmation popup — centered above block */}
      {confirmingDelete && (
        <div className="absolute left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-0.5 rounded-md bg-gray-800 px-2 py-1.5 shadow-lg" style={{ bottom: "calc(100% + 4px)" }}>
          <span style={{ color: "white", fontSize: "10px" }}>Opravdu smazat?</span>
          <button
            type="button"
            className="rounded bg-red-400 px-3 py-0.5 font-medium text-white transition-colors hover:bg-red-500"
            style={{ fontSize: "10px" }}
            onClick={() => {
              setConfirmingDelete(false);
              onDelete();
            }}
          >
            Odstranit
          </button>
          <div className="absolute left-1/2 -bottom-1 -translate-x-1/2 h-0 w-0 border-x-[5px] border-t-[5px] border-x-transparent border-t-gray-800" />
        </div>
      )}

      {/* Top edge: pin icon + dashed line (line only when not active/editing) */}
      {isHovered && edgePosition === "top" && !pickerOpen && (
        <div
          className="absolute inset-x-0 top-0 flex -translate-y-1/2 items-center"
        >
          <button
            type="button"
            className="peer z-10 flex shrink-0 items-center justify-center transition-colors"
            style={{ marginLeft: "-2rem", marginRight: "-0.5rem" }}
            onClick={() => handlePlusClick("top")}
          >
            <MapPinPlusInside className="h-8 w-8 -rotate-90 fill-white stroke-black/60 transition-colors hover:fill-black hover:stroke-white" strokeWidth={0.5} />
          </button>
          {!isActive && (
            <div className="h-px flex-1 border-t border-dashed border-black/60 transition-all peer-hover:border-t-[3px] peer-hover:border-solid peer-hover:border-black" />
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
            className="peer z-10 flex shrink-0 items-center justify-center transition-colors"
            style={{ marginLeft: "-2rem", marginRight: "-0.5rem" }}
            onClick={() => handlePlusClick("bottom")}
          >
            <MapPinPlusInside className="h-8 w-8 -rotate-90 fill-white stroke-black/60 transition-colors hover:fill-black hover:stroke-white" strokeWidth={0.5} />
          </button>
          {!isActive && (
            <div className="h-px flex-1 border-t border-dashed border-black/60 transition-all peer-hover:border-t-[3px] peer-hover:border-solid peer-hover:border-black" />
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
