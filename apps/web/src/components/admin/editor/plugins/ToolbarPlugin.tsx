"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $getSelection,
  $isRangeSelection,
  $isElementNode,
  FORMAT_TEXT_COMMAND,
  FORMAT_ELEMENT_COMMAND,
  SELECTION_CHANGE_COMMAND,
  COMMAND_PRIORITY_LOW,
  $createParagraphNode,
  type ElementFormatType,
} from "lexical";
import { $isHeadingNode, $createHeadingNode, type HeadingTagType, $createQuoteNode, $isQuoteNode } from "@lexical/rich-text";
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
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Bold,
  Italic,
  Link,
  List,
  ListOrdered,
  ChevronDown,
  TextQuote,
} from "lucide-react";
import {
  Button,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@samofujera/ui";

type BlockType = "paragraph" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "quote" | "ul" | "ol";

const BLOCK_TYPE_OPTIONS: Array<{ type: BlockType; label: string }> = [
  { type: "h1", label: "Nadpis 1" },
  { type: "h2", label: "Nadpis 2" },
  { type: "h3", label: "Nadpis 3" },
  { type: "h4", label: "Nadpis 4" },
  { type: "h5", label: "Nadpis 5" },
  { type: "h6", label: "Nadpis 6" },
  { type: "paragraph", label: "Odstavec" },
  { type: "quote", label: "Citace" },
];

const BLOCK_TYPE_LABELS: Record<BlockType, string> = {
  paragraph: "Odstavec",
  h1: "Nadpis 1",
  h2: "Nadpis 2",
  h3: "Nadpis 3",
  h4: "Nadpis 4",
  h5: "Nadpis 5",
  h6: "Nadpis 6",
  quote: "Citace",
  ul: "Seznam",
  ol: "Číslovaný seznam",
};

const ALIGNMENT_ICON: Record<string, typeof AlignLeft> = {
  "": AlignLeft,
  left: AlignLeft,
  center: AlignCenter,
  right: AlignRight,
  justify: AlignJustify,
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
  const [elementFormat, setElementFormat] = useState<ElementFormatType>("");
  const [isList, setIsList] = useState(false);
  const [listType, setListType] = useState<"ul" | "ol">("ul");

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
        const lt = type === "number" ? "ol" : "ul";
        setBlockType(lt);
        setIsList(true);
        setListType(lt as "ul" | "ol");
      } else if ($isQuoteNode(element)) {
        setBlockType("quote");
        setIsList(false);
      } else {
        const type = $isHeadingNode(element) ? element.getTag() : "paragraph";
        setBlockType(type as BlockType);
        setIsList(false);
      }

      // Read element alignment
      if ($isElementNode(element)) {
        setElementFormat(element.getFormatType());
      }
    }

    // Check if link
    const node = selection.anchor.getNode();
    const parent = node.getParent();
    setIsLink($isLinkNode(parent) || $isLinkNode(node));

    // Position toolbar — centered above the entire editor block
    const editorRoot = editor.getRootElement();
    if (editorRoot) {
      const editorRect = editorRoot.getBoundingClientRect();
      setToolbarPosition({
        top: -50,
        left: editorRect.width / 2,
      });
      setShowToolbar(true);
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

  // Hide toolbar when focus leaves the editor entirely
  useEffect(() => {
    const rootElement = editor.getRootElement();
    if (!rootElement) return;

    function handleBlur(e: FocusEvent) {
      const relatedTarget = e.relatedTarget as Node | null;
      // If focus moved to toolbar, stay visible
      if (relatedTarget && toolbarRef.current?.contains(relatedTarget)) return;
      // If focus moved to a Radix portal (dropdown menu), stay visible
      if (relatedTarget instanceof HTMLElement) {
        const portal = relatedTarget.closest(
          "[data-radix-popper-content-wrapper], [role='menu'], [data-radix-menu-content]",
        );
        if (portal) return;
      }
      setShowToolbar(false);
    }

    rootElement.addEventListener("focusout", handleBlur);
    return () => rootElement.removeEventListener("focusout", handleBlur);
  }, [editor]);

  function formatBlock(type: BlockType) {
    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;

      if (type === "paragraph") {
        $setBlocksType(selection, () => $createParagraphNode());
      } else if (type === "quote") {
        $setBlocksType(selection, () => $createQuoteNode());
      } else if (type === "h1" || type === "h2" || type === "h3" || type === "h4" || type === "h5" || type === "h6") {
        $setBlocksType(selection, () => $createHeadingNode(type as HeadingTagType));
      } else if (type === "ul") {
        editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
      } else if (type === "ol") {
        editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
      }
    });
  }

  function formatAlignment(alignment: ElementFormatType) {
    editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, alignment);
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

  // Current alignment icon
  const CurrentAlignIcon = ALIGNMENT_ICON[elementFormat] ?? AlignLeft;
  // Current list icon
  const CurrentListIcon = listType === "ol" ? ListOrdered : List;
  // Block type label (only for non-list types in dropdown)
  const dropdownLabel = isList ? BLOCK_TYPE_LABELS[blockType] : BLOCK_TYPE_LABELS[blockType];

  return (
    <div
      ref={toolbarRef}
      className="absolute z-50 flex items-center gap-0.5 rounded-lg border border-[var(--border)] bg-[var(--card)] p-1 shadow-lg"
      style={{
        top: `${toolbarPosition.top}px`,
        left: `${toolbarPosition.left}px`,
        transform: "translateX(-50%)",
      }}
    >
      {/* Block type dropdown — H1-H6, Odstavec, Citace */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 gap-1 px-2 text-xs">
            {dropdownLabel}
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {BLOCK_TYPE_OPTIONS.map(({ type, label }) => (
            <DropdownMenuItem key={type} onClick={() => formatBlock(type)}>
              {type === "quote" && <TextQuote className="mr-2 h-4 w-4" />}
              {label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="mx-0.5 h-5 w-px bg-[var(--border)]" />

      {/* Bold */}
      <Button
        variant={isBold ? "default" : "ghost"}
        size="sm"
        className="h-8 w-8 p-0"
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold")}
        title="Tučné"
      >
        <Bold className="h-4 w-4" />
      </Button>

      {/* Italic */}
      <Button
        variant={isItalic ? "default" : "ghost"}
        size="sm"
        className="h-8 w-8 p-0"
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic")}
        title="Kurzíva"
      >
        <Italic className="h-4 w-4" />
      </Button>

      <div className="mx-0.5 h-5 w-px bg-[var(--border)]" />

      {/* Alignment dropdown — one icon with arrow */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={elementFormat && elementFormat !== "left" ? "default" : "ghost"}
            size="sm"
            className="h-8 gap-0.5 px-1.5"
            title="Zarovnání"
          >
            <CurrentAlignIcon className="h-4 w-4" />
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="flex min-w-0 gap-1 p-1">
          <Button
            variant={elementFormat === "" || elementFormat === "left" ? "default" : "ghost"}
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => formatAlignment("left")}
            title="Vlevo"
          >
            <AlignLeft className="h-4 w-4" />
          </Button>
          <Button
            variant={elementFormat === "center" ? "default" : "ghost"}
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => formatAlignment("center")}
            title="Na střed"
          >
            <AlignCenter className="h-4 w-4" />
          </Button>
          <Button
            variant={elementFormat === "right" ? "default" : "ghost"}
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => formatAlignment("right")}
            title="Vpravo"
          >
            <AlignRight className="h-4 w-4" />
          </Button>
          <Button
            variant={elementFormat === "justify" ? "default" : "ghost"}
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => formatAlignment("justify")}
            title="Do bloku"
          >
            <AlignJustify className="h-4 w-4" />
          </Button>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* List dropdown — one icon with arrow */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={isList ? "default" : "ghost"}
            size="sm"
            className="h-8 gap-0.5 px-1.5"
            title="Seznam"
          >
            <CurrentListIcon className="h-4 w-4" />
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="flex min-w-0 gap-1 p-1">
          <Button
            variant={isList && listType === "ul" ? "default" : "ghost"}
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => formatBlock("ul")}
            title="Seznam"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={isList && listType === "ol" ? "default" : "ghost"}
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => formatBlock("ol")}
            title="Číslovaný seznam"
          >
            <ListOrdered className="h-4 w-4" />
          </Button>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="mx-0.5 h-5 w-px bg-[var(--border)]" />

      {/* Link */}
      <Button
        variant={isLink ? "default" : "ghost"}
        size="sm"
        className="h-8 w-8 p-0"
        onClick={insertLink}
        title="Odkaz"
      >
        <Link className="h-4 w-4" />
      </Button>
    </div>
  );
}
