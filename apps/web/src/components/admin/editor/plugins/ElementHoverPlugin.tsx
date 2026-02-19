"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $createParagraphNode,
  $getRoot,
  $getNodeByKey,
  type NodeKey,
} from "lexical";
import { Plus } from "lucide-react";
import { $createImageNode } from "../nodes/ImageNode";
import { $createButtonNode } from "../nodes/ButtonNode";
import { $createSeparatorNode } from "../nodes/SeparatorNode";
import {
  ElementPickerPopover,
  type ElementType,
} from "./ElementPickerPopover";

export function ElementHoverPlugin() {
  const [editor] = useLexicalComposerContext();
  const [hoveredKey, setHoveredKey] = useState<NodeKey | null>(null);
  const [hoveredRect, setHoveredRect] = useState<DOMRect | null>(null);
  const [edgePosition, setEdgePosition] = useState<"top" | "bottom" | null>(
    null,
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerEdge, setPickerEdge] = useState<"top" | "bottom">("bottom");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (pickerOpen) return;

      const rootElement = editor.getRootElement();
      if (!rootElement) return;

      const rootRect = rootElement.getBoundingClientRect();
      if (e.clientX < rootRect.left || e.clientX > rootRect.right) {
        setHoveredKey(null);
        setHoveredRect(null);
        setEdgePosition(null);
        return;
      }

      editor.getEditorState().read(() => {
        const root = $getRoot();
        const children = root.getChildren();

        let foundKey: NodeKey | null = null;
        let foundRect: DOMRect | null = null;
        let foundEdge: "top" | "bottom" | null = null;

        for (const child of children) {
          const el = editor.getElementByKey(child.__key);
          if (!el) continue;
          const rect = el.getBoundingClientRect();

          if (e.clientY >= rect.top - 4 && e.clientY <= rect.bottom + 4) {
            foundKey = child.__key;
            foundRect = rect;

            const relativeY = (e.clientY - rect.top) / rect.height;
            if (relativeY < 0.25) {
              foundEdge = "top";
            } else if (relativeY > 0.75) {
              foundEdge = "bottom";
            } else {
              foundEdge = null;
            }
            break;
          }
        }

        setHoveredKey(foundKey);
        setHoveredRect(foundRect);
        setEdgePosition(foundEdge);
      });
    },
    [editor, pickerOpen],
  );

  useEffect(() => {
    document.addEventListener("mousemove", handleMouseMove);
    return () => document.removeEventListener("mousemove", handleMouseMove);
  }, [handleMouseMove]);

  const insertElement = useCallback(
    (type: ElementType) => {
      if (!hoveredKey) return;

      editor.update(() => {
        const targetNode = $getNodeByKey(hoveredKey);
        if (!targetNode) return;

        let newNode;
        switch (type) {
          case "paragraph":
            newNode = $createParagraphNode();
            break;
          case "image":
            newNode = $createImageNode();
            break;
          case "separator":
            newNode = $createSeparatorNode();
            break;
          case "button":
            newNode = $createButtonNode();
            break;
        }

        if (pickerEdge === "top") {
          targetNode.insertBefore(newNode);
        } else {
          targetNode.insertAfter(newNode);
        }

        if (type !== "paragraph") {
          newNode.insertAfter($createParagraphNode());
        }

        if (type === "paragraph") {
          newNode.selectStart();
        }
      });

      setPickerOpen(false);
      setHoveredKey(null);
      setHoveredRect(null);
      setEdgePosition(null);
    },
    [editor, hoveredKey, pickerEdge],
  );

  function handlePlusClick(edge: "top" | "bottom") {
    setPickerEdge(edge);
    setPickerOpen(true);
  }

  if (!mounted) return null;

  return createPortal(
    <>
      {/* Dashed border around hovered element */}
      {hoveredRect && hoveredKey && !pickerOpen && (
        <div
          className="pointer-events-none fixed rounded border-2 border-dashed border-[rgb(6,93,77)]/40"
          style={{
            top: hoveredRect.top - 2,
            left: hoveredRect.left - 2,
            width: hoveredRect.width + 4,
            height: hoveredRect.height + 4,
            zIndex: 40,
          }}
        />
      )}

      {/* Top edge: dashed line + small + button */}
      {hoveredRect && edgePosition === "top" && !pickerOpen && (
        <div
          className="fixed flex items-center"
          style={{
            top: hoveredRect.top - 1,
            left: hoveredRect.left,
            width: hoveredRect.width,
            zIndex: 41,
          }}
        >
          <button
            type="button"
            className="pointer-events-auto -ml-3 flex h-5 w-5 items-center justify-center rounded-full border border-[rgb(6,93,77)] bg-white text-[rgb(6,93,77)] transition-colors hover:bg-[rgb(6,93,77)] hover:text-white"
            onClick={() => handlePlusClick("top")}
          >
            <Plus className="h-3 w-3" />
          </button>
          <div className="h-px flex-1 border-t border-dashed border-[rgb(6,93,77)]/60" />
        </div>
      )}

      {/* Bottom edge: dashed line + small + button */}
      {hoveredRect && edgePosition === "bottom" && !pickerOpen && (
        <div
          className="fixed flex items-center"
          style={{
            top: hoveredRect.bottom,
            left: hoveredRect.left,
            width: hoveredRect.width,
            zIndex: 41,
          }}
        >
          <button
            type="button"
            className="pointer-events-auto -ml-3 flex h-5 w-5 items-center justify-center rounded-full border border-[rgb(6,93,77)] bg-white text-[rgb(6,93,77)] transition-colors hover:bg-[rgb(6,93,77)] hover:text-white"
            onClick={() => handlePlusClick("bottom")}
          >
            <Plus className="h-3 w-3" />
          </button>
          <div className="h-px flex-1 border-t border-dashed border-[rgb(6,93,77)]/60" />
        </div>
      )}

      {/* Element picker popover */}
      {pickerOpen && hoveredRect && (
        <ElementPickerPopover
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          onSelect={insertElement}
          anchorStyle={{
            top:
              pickerEdge === "top" ? hoveredRect.top : hoveredRect.bottom,
            left: hoveredRect.left,
          }}
        />
      )}
    </>,
    document.body,
  );
}
