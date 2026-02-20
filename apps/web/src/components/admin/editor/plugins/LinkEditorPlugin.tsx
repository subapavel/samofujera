"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $getSelection,
  $isRangeSelection,
  SELECTION_CHANGE_COMMAND,
  COMMAND_PRIORITY_LOW,
  COMMAND_PRIORITY_HIGH,
  createCommand,
} from "lexical";
import { $isLinkNode, LinkNode, TOGGLE_LINK_COMMAND } from "@lexical/link";
import { ExternalLink, Pencil, Trash2 } from "lucide-react";
import { LinkEditorPanel } from "../shared/LinkEditorPanel";

export const OPEN_LINK_EDITOR_COMMAND = createCommand<void>("OPEN_LINK_EDITOR");

type Mode = "hidden" | "view" | "edit";

interface LinkData {
  url: string;
  target: string | null;
  nodeKey: string;
}

export function LinkEditorPlugin() {
  const [editor] = useLexicalComposerContext();
  const containerRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<Mode>("hidden");
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [linkData, setLinkData] = useState<LinkData | null>(null);

  const positionPopover = useCallback((anchorElement: HTMLElement) => {
    const editorRoot = editor.getRootElement();
    if (!editorRoot) return;

    const editorRect = editorRoot.getBoundingClientRect();
    const anchorRect = anchorElement.getBoundingClientRect();

    setPosition({
      top: anchorRect.bottom - editorRect.top + 8,
      left: anchorRect.left - editorRect.left + anchorRect.width / 2,
    });
  }, [editor]);

  const findLinkNode = useCallback((): { node: LinkNode; element: HTMLElement } | null => {
    let result: { node: LinkNode; element: HTMLElement } | null = null;
    editor.getEditorState().read(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;
      const anchorNode = selection.anchor.getNode();
      const parent = anchorNode.getParent();
      const linkNode = $isLinkNode(parent) ? parent : $isLinkNode(anchorNode) ? anchorNode : null;
      if (!linkNode) return;
      const element = editor.getElementByKey(linkNode.getKey());
      if (element) {
        result = { node: linkNode, element };
      }
    });
    return result;
  }, [editor]);

  // Open link editor when toolbar button is clicked
  useEffect(() => {
    return editor.registerCommand(
      OPEN_LINK_EDITOR_COMMAND,
      () => {
        const existing = findLinkNode();
        if (existing) {
          setLinkData({
            url: existing.node.getURL(),
            target: existing.node.getTarget(),
            nodeKey: existing.node.getKey(),
          });
          setMode("view");
          positionPopover(existing.element);
        } else {
          setLinkData(null);

          const nativeSelection = window.getSelection();
          if (nativeSelection && nativeSelection.rangeCount > 0) {
            const range = nativeSelection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            const editorRoot = editor.getRootElement();
            if (editorRoot) {
              const editorRect = editorRoot.getBoundingClientRect();
              setPosition({
                top: rect.bottom - editorRect.top + 8,
                left: rect.left - editorRect.left + rect.width / 2,
              });
            }
          }
          setMode("edit");
        }
        return true;
      },
      COMMAND_PRIORITY_HIGH,
    );
  }, [editor, findLinkNode, positionPopover]);

  // Close on selection change to somewhere without a link
  useEffect(() => {
    return editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      () => {
        if (mode === "hidden") return false;
        const existing = findLinkNode();
        if (!existing && mode === "view") {
          setMode("hidden");
        }
        return false;
      },
      COMMAND_PRIORITY_LOW,
    );
  }, [editor, mode, findLinkNode]);

  // Close on click outside
  useEffect(() => {
    if (mode === "hidden") return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setMode("hidden");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [mode]);

  // Close on Escape
  useEffect(() => {
    if (mode === "hidden") return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMode("hidden");
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [mode]);

  function handleApplyLink(url: string, openInNewTab: boolean) {
    const trimmed = url.trim();
    if (!trimmed) return;
    const target = openInNewTab ? "_blank" : null;
    editor.dispatchCommand(TOGGLE_LINK_COMMAND, { url: trimmed, target });
    setMode("hidden");
  }

  function handleEditExisting() {
    if (linkData) {
      setMode("edit");
    }
  }

  function handleRemoveLink() {
    editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
    setMode("hidden");
  }

  function handleVisitLink() {
    if (linkData) {
      window.open(linkData.url, "_blank");
    }
  }

  if (mode === "hidden") return null;

  return (
    <div
      ref={containerRef}
      className="absolute z-[60]"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        transform: "translateX(-50%)",
      }}
    >
      {/* Arrow */}
      <div className="flex justify-center">
        <div className="h-0 w-0 border-x-8 border-b-8 border-x-transparent border-b-gray-800" />
      </div>

      {mode === "view" && linkData && (
        <div className="flex items-center gap-1 rounded-lg border border-gray-700 bg-gray-800 p-1 shadow-lg">
          <button type="button" className="flex items-center gap-1.5 rounded px-3 py-1.5 text-xs text-white/90 transition-colors hover:bg-white/10" onClick={handleVisitLink}>
            <ExternalLink className="h-3.5 w-3.5" />
            Přejít na odkaz
          </button>
          <div className="h-5 w-px bg-white/20" />
          <button type="button" className="flex items-center gap-1.5 rounded px-3 py-1.5 text-xs text-white/90 transition-colors hover:bg-white/10" onClick={handleEditExisting}>
            <Pencil className="h-3.5 w-3.5" />
            Upravit odkaz
          </button>
          <div className="h-5 w-px bg-white/20" />
          <button type="button" className="flex items-center gap-1.5 rounded px-3 py-1.5 text-xs text-red-400 transition-colors hover:bg-white/10 hover:text-red-300" onClick={handleRemoveLink}>
            <Trash2 className="h-3.5 w-3.5" />
            Odstranit odkaz
          </button>
        </div>
      )}

      {mode === "edit" && (
        <div className="w-80 rounded-lg border border-gray-700 bg-gray-800 p-4 shadow-lg">
          <p className="mb-2 text-sm font-semibold text-white">Odkaz:</p>
          <LinkEditorPanel
            initialUrl={linkData?.url}
            initialOpenInNewTab={linkData?.target === "_blank"}
            confirmLabel="Použít"
            cancelLabel="Zrušit"
            onConfirm={handleApplyLink}
            onCancel={() => setMode("hidden")}
          />
        </div>
      )}
    </div>
  );
}
