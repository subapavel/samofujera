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
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { pageAdminApi } from "@samofujera/api-client";
import { ChevronDown, ExternalLink, Pencil, Trash2 } from "lucide-react";
import { Button, Input } from "@samofujera/ui";

export const OPEN_LINK_EDITOR_COMMAND = createCommand<void>("OPEN_LINK_EDITOR");

type Mode = "hidden" | "view" | "edit";

interface LinkData {
  url: string;
  target: string | null;
  nodeKey: string;
}

export function LinkEditorPlugin() {
  const [editor] = useLexicalComposerContext();
  const params = useParams();
  const currentPageId = params?.pageId as string | undefined;
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<Mode>("hidden");
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [linkData, setLinkData] = useState<LinkData | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [openInNewTab, setOpenInNewTab] = useState(false);
  const [showPagePicker, setShowPagePicker] = useState(false);

  // Fetch existing pages for the dropdown
  const pagesQuery = useQuery({
    queryKey: ["admin", "pages", { limit: 100 }],
    queryFn: () => pageAdminApi.getPages({ limit: 100 }),
    enabled: showPagePicker,
  });

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
          // Existing link — show view mode
          setLinkData({
            url: existing.node.getURL(),
            target: existing.node.getTarget(),
            nodeKey: existing.node.getKey(),
          });
          setMode("view");
          positionPopover(existing.element);
        } else {
          // No link — show edit mode for new link
          setUrlInput("");
          setOpenInNewTab(false);
          setLinkData(null);
          setShowPagePicker(false);

          // Position from selection
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
          setTimeout(() => inputRef.current?.focus(), 50);
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
        // If user clicks elsewhere, close
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
        setShowPagePicker(false);
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
        setShowPagePicker(false);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [mode]);

  function handleApplyLink() {
    const url = urlInput.trim();
    if (!url) return;
    const target = openInNewTab ? "_blank" : null;
    editor.dispatchCommand(TOGGLE_LINK_COMMAND, { url, target });
    setMode("hidden");
    setShowPagePicker(false);
  }

  function handleEditExisting() {
    if (linkData) {
      setUrlInput(linkData.url);
      setOpenInNewTab(linkData.target === "_blank");
      setShowPagePicker(false);
      setMode("edit");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  function handleRemoveLink() {
    editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
    setMode("hidden");
    setShowPagePicker(false);
  }

  function handleVisitLink() {
    if (linkData) {
      window.open(linkData.url, "_blank");
    }
  }

  function handleSelectPage(slug: string) {
    setUrlInput(`/pages/${slug}`);
    setShowPagePicker(false);
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
        <div className="h-0 w-0 border-x-8 border-b-8 border-x-transparent border-b-[var(--card)]" />
      </div>

      {mode === "view" && linkData && (
        <div className="flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--card)] p-1 shadow-lg">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 px-3 text-xs"
            onClick={handleVisitLink}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Přejít na odkaz
          </Button>
          <div className="h-5 w-px bg-[var(--border)]" />
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 px-3 text-xs"
            onClick={handleEditExisting}
          >
            <Pencil className="h-3.5 w-3.5" />
            Upravit odkaz
          </Button>
          <div className="h-5 w-px bg-[var(--border)]" />
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 px-3 text-xs text-red-600 hover:text-red-700"
            onClick={handleRemoveLink}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Odstranit odkaz
          </Button>
        </div>
      )}

      {mode === "edit" && (
        <div className="w-80 rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 shadow-lg">
          <p className="mb-2 text-sm font-semibold">Odkaz:</p>
          <div className="relative mb-3">
            <Input
              ref={inputRef}
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleApplyLink();
                }
              }}
              placeholder="např. www.google.cz"
              className="pr-9"
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
              onClick={() => setShowPagePicker(!showPagePicker)}
              title="Vybrat stránku"
            >
              <ChevronDown className={`h-4 w-4 transition-transform ${showPagePicker ? "rotate-180" : ""}`} />
            </button>
          </div>

          {/* Page picker dropdown */}
          {showPagePicker && (
            <div className="mb-3 max-h-40 overflow-y-auto rounded-md border border-[var(--border)] bg-[var(--background)]">
              {pagesQuery.isLoading && (
                <p className="p-2 text-xs text-[var(--muted-foreground)]">Načítání...</p>
              )}
              {pagesQuery.data?.data?.items
                ?.filter((page) => page.id !== currentPageId)
                .map((page) => (
                <button
                  key={page.id}
                  type="button"
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-[var(--accent)]"
                  onClick={() => handleSelectPage(page.slug)}
                >
                  <span className="truncate">{page.title}</span>
                  <span className="shrink-0 text-xs text-[var(--muted-foreground)]">/{page.slug}</span>
                </button>
              ))}
              {pagesQuery.data?.data?.items?.filter((p) => p.id !== currentPageId).length === 0 && (
                <p className="p-2 text-xs text-[var(--muted-foreground)]">Žádné stránky</p>
              )}
            </div>
          )}

          <label className="mb-4 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={openInNewTab}
              onChange={(e) => setOpenInNewTab(e.target.checked)}
              className="h-4 w-4 rounded border-[var(--border)]"
            />
            Otevřít v novém okně
          </label>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setMode("hidden");
                setShowPagePicker(false);
              }}
            >
              Zrušit
            </Button>
            <Button
              size="sm"
              onClick={handleApplyLink}
              disabled={!urlInput.trim()}
            >
              Použít
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
