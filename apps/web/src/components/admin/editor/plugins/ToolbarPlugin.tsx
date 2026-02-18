"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $getSelection,
  $isRangeSelection,
  FORMAT_TEXT_COMMAND,
  SELECTION_CHANGE_COMMAND,
  COMMAND_PRIORITY_LOW,
  $isRootOrShadowRoot,
  $createParagraphNode,
} from "lexical";
import { $isHeadingNode, $createHeadingNode, type HeadingTagType } from "@lexical/rich-text";
import {
  INSERT_UNORDERED_LIST_COMMAND,
  INSERT_ORDERED_LIST_COMMAND,
  $isListNode,
  ListNode,
} from "@lexical/list";
import { $isLinkNode, TOGGLE_LINK_COMMAND } from "@lexical/link";
import { $getNearestNodeOfType } from "@lexical/utils";
import { $setBlocksType } from "@lexical/selection";
import {
  Button,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@samofujera/ui";

type BlockType = "paragraph" | "h2" | "h3" | "ul" | "ol";

const BLOCK_TYPE_LABELS: Record<BlockType, string> = {
  paragraph: "Odstavec",
  h2: "Nadpis 2",
  h3: "Nadpis 3",
  ul: "Seznam",
  ol: "Cislovany seznam",
};

export function ToolbarPlugin() {
  const [editor] = useLexicalComposerContext();
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [showToolbar, setShowToolbar] = useState(false);
  const [toolbarPosition, setToolbarPosition] = useState({ top: 0, left: 0 });
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isLink, setIsLink] = useState(false);
  const [blockType, setBlockType] = useState<BlockType>("paragraph");

  const updateToolbar = useCallback(() => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection)) {
      setShowToolbar(false);
      return;
    }

    setIsBold(selection.hasFormat("bold"));
    setIsItalic(selection.hasFormat("italic"));

    const anchorNode = selection.anchor.getNode();
    let element =
      anchorNode.getKey() === "root"
        ? anchorNode
        : anchorNode.getTopLevelElementOrThrow();

    const elementKey = element.getKey();
    const elementDOM = editor.getElementByKey(elementKey);

    if (elementDOM !== null) {
      if ($isListNode(element)) {
        const parentList = $getNearestNodeOfType<ListNode>(anchorNode, ListNode);
        const type = parentList ? parentList.getListType() : element.getListType();
        setBlockType(type === "number" ? "ol" : "ul");
      } else {
        const type = $isHeadingNode(element) ? element.getTag() : "paragraph";
        setBlockType(type as BlockType);
      }
    }

    // Check if link
    const node = selection.anchor.getNode();
    const parent = node.getParent();
    setIsLink($isLinkNode(parent) || $isLinkNode(node));

    // Position toolbar
    const nativeSelection = window.getSelection();
    if (nativeSelection && !nativeSelection.isCollapsed && nativeSelection.rangeCount > 0) {
      const range = nativeSelection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const editorRoot = editor.getRootElement();
      if (editorRoot) {
        const editorRect = editorRoot.getBoundingClientRect();
        setToolbarPosition({
          top: rect.top - editorRect.top - 50,
          left: rect.left - editorRect.left + rect.width / 2,
        });
        setShowToolbar(true);
      }
    } else {
      setShowToolbar(false);
    }
  }, [editor]);

  useEffect(() => {
    return editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      () => {
        updateToolbar();
        return false;
      },
      COMMAND_PRIORITY_LOW,
    );
  }, [editor, updateToolbar]);

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        updateToolbar();
      });
    });
  }, [editor, updateToolbar]);

  function formatBlock(type: BlockType) {
    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;

      if (type === "paragraph") {
        $setBlocksType(selection, () => $createParagraphNode());
      } else if (type === "h2" || type === "h3") {
        $setBlocksType(selection, () => $createHeadingNode(type as HeadingTagType));
      } else if (type === "ul") {
        editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
      } else if (type === "ol") {
        editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
      }
    });
  }

  function insertLink() {
    if (isLink) {
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
    } else {
      const url = window.prompt("URL:");
      if (url) {
        editor.dispatchCommand(TOGGLE_LINK_COMMAND, url);
      }
    }
  }

  if (!showToolbar) return null;

  return (
    <div
      ref={toolbarRef}
      className="absolute z-50 flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--card)] p-1 shadow-lg"
      style={{
        top: `${toolbarPosition.top}px`,
        left: `${toolbarPosition.left}px`,
        transform: "translateX(-50%)",
      }}
    >
      {/* Block type dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 px-2 text-xs">
            {BLOCK_TYPE_LABELS[blockType]}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {(Object.entries(BLOCK_TYPE_LABELS) as Array<[BlockType, string]>).map(
            ([type, label]) => (
              <DropdownMenuItem key={type} onClick={() => formatBlock(type)}>
                {label}
              </DropdownMenuItem>
            ),
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="mx-1 h-5 w-px bg-[var(--border)]" />

      {/* Bold */}
      <Button
        variant={isBold ? "default" : "ghost"}
        size="sm"
        className="h-8 w-8 p-0 font-bold"
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold")}
      >
        B
      </Button>

      {/* Italic */}
      <Button
        variant={isItalic ? "default" : "ghost"}
        size="sm"
        className="h-8 w-8 p-0 italic"
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic")}
      >
        I
      </Button>

      <div className="mx-1 h-5 w-px bg-[var(--border)]" />

      {/* Link */}
      <Button
        variant={isLink ? "default" : "ghost"}
        size="sm"
        className="h-8 px-2 text-xs"
        onClick={insertLink}
      >
        Link
      </Button>
    </div>
  );
}
