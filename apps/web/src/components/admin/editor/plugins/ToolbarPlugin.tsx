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
  INDENT_CONTENT_COMMAND,
  OUTDENT_CONTENT_COMMAND,
  type ElementFormatType,
} from "lexical";
import { $isHeadingNode, $createHeadingNode, type HeadingTagType, $createQuoteNode, $isQuoteNode } from "@lexical/rich-text";
import {
  INSERT_UNORDERED_LIST_COMMAND,
  INSERT_ORDERED_LIST_COMMAND,
  $isListNode,
  ListNode,
} from "@lexical/list";
import { $isLinkNode } from "@lexical/link";
import { OPEN_LINK_EDITOR_COMMAND } from "./LinkEditorPlugin";
import { $getNearestNodeOfType } from "@lexical/utils";
import { $setBlocksType } from "@lexical/selection";
import { $patchStyleText, $getSelectionStyleValueForProperty } from "@lexical/selection";
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
  ChevronRight,
  TextQuote,
  Indent,
  Outdent,
} from "lucide-react";
import {
  Button,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  Popover,
  PopoverTrigger,
  PopoverContent,
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

// Color palette matching the screenshot — 8 columns, 6 rows
const COLOR_PALETTE = [
  // Row 1: grayscale
  null, "#000000", "#1a1a1a", "#333333", "#666666", "#999999", "#cccccc", "#ffffff",
  // Row 2: warm vivid
  "#e63946", "#f4845f", "#f9c74f", "#57a773", "#2ec4b6", "#4361ee", "#6c7ae0", "#c77dff",
  // Row 3: warm medium
  "#c1121f", "#e76f51", "#e9c46a", "#43aa8b", "#20c997", "#3a86ff", "#5c6eb8", "#b5179e",
  // Row 4: warm dark
  "#9b2226", "#d45d2a", "#d4a017", "#2d6a4f", "#17a589", "#2563eb", "#4c5a99", "#9b2d8e",
  // Row 5: deep
  "#780000", "#ae3c00", "#b28900", "#1b4332", "#0f766e", "#1d4ed8", "#3b4880", "#7b2d8e",
  // Row 6: darkest
  "#590000", "#8b2f00", "#8b6f00", "#0d3320", "#115e59", "#1e40af", "#2e3a6e", "#5b1f6e",
];

// Default text colors by block type
const BRAND_COLOR = "#065d4d";
const DEFAULT_BLOCK_COLORS: Partial<Record<BlockType, string>> = {
  h1: BRAND_COLOR,
  h2: BRAND_COLOR,
  h3: BRAND_COLOR,
  h4: BRAND_COLOR,
  h5: BRAND_COLOR,
  h6: BRAND_COLOR,
  paragraph: "#000000",
  quote: "#000000",
  ul: "#000000",
  ol: "#000000",
};

// Font size steps (percentages)
const FONT_SIZE_OPTIONS = [
  "50%", "62.5%", "75%", "87.5%", "100%", "112.5%", "125%", "150%", "175%", "200%", "250%", "300%",
];

export function ToolbarPlugin() {
  const [editor] = useLexicalComposerContext();
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [showToolbar, setShowToolbar] = useState(false);
  const [toolbarPosition, setToolbarPosition] = useState({ left: 0 });
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isLink, setIsLink] = useState(false);
  const [blockType, setBlockType] = useState<BlockType>("paragraph");
  const [elementFormat, setElementFormat] = useState<ElementFormatType>("");
  const [isList, setIsList] = useState(false);
  const [listType, setListType] = useState<"ul" | "ol">("ul");
  const [showExtras, setShowExtras] = useState(false);
  const [fontColor, setFontColor] = useState<string>("");
  const [fontSize, setFontSize] = useState<string>("");

  const updateToolbar = useCallback(() => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection)) {
      setShowToolbar(false);
      return;
    }

    setIsBold(selection.hasFormat("bold"));
    setIsItalic(selection.hasFormat("italic"));

    // Read inline styles
    setFontColor($getSelectionStyleValueForProperty(selection, "color", ""));
    setFontSize($getSelectionStyleValueForProperty(selection, "font-size", ""));

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
      // If focus moved to a Radix portal (dropdown menu, popover), stay visible
      if (relatedTarget instanceof HTMLElement) {
        const portal = relatedTarget.closest(
          "[data-radix-popper-content-wrapper], [role='menu'], [data-radix-menu-content], [data-radix-popover-content]",
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
    editor.dispatchCommand(OPEN_LINK_EDITOR_COMMAND, undefined);
  }

  function applyFontColor(color: string | null) {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $patchStyleText(selection, { color });
      }
    });
  }

  function applyFontSize(size: string | null) {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $patchStyleText(selection, { "font-size": size });
      }
    });
  }

  function adjustFontSize(direction: "up" | "down") {
    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;
      const current = $getSelectionStyleValueForProperty(selection, "font-size", "");
      let pct = 100;
      if (current) {
        if (current.endsWith("%")) {
          pct = parseFloat(current);
        } else if (current.endsWith("px")) {
          // Approximate: 16px = 100%
          pct = (parseFloat(current) / 16) * 100;
        }
      }
      const newPct = direction === "up" ? Math.round(pct + 10) : Math.round(pct - 10);
      const clamped = Math.max(25, Math.min(400, newPct));
      $patchStyleText(selection, { "font-size": `${clamped}%` });
    });
  }

  if (!showToolbar) return null;

  // Current alignment icon
  const CurrentAlignIcon = ALIGNMENT_ICON[elementFormat] ?? AlignLeft;
  // Current list icon
  const CurrentListIcon = listType === "ol" ? ListOrdered : List;
  // Block type label (only for non-list types in dropdown)
  const dropdownLabel = isList ? BLOCK_TYPE_LABELS[blockType] : BLOCK_TYPE_LABELS[blockType];

  // Effective color: explicit inline color > default for block type > black
  const effectiveColor = fontColor || DEFAULT_BLOCK_COLORS[blockType] || "#000000";

  // Font size display
  let fontSizeDisplay = "100 %";
  if (fontSize) {
    if (fontSize.endsWith("%")) {
      fontSizeDisplay = `${Math.round(parseFloat(fontSize))} %`;
    } else if (fontSize.endsWith("px")) {
      fontSizeDisplay = `${Math.round((parseFloat(fontSize) / 16) * 100)} %`;
    }
  }

  return (
    <div
      ref={toolbarRef}
      className="absolute z-50 flex flex-col items-center gap-1"
      style={{
        bottom: "calc(100% + 6px)",
        left: "50%",
        transform: "translateX(-50%)",
      }}
    >
      {/* Main toolbar row */}
      <div className="relative flex items-center gap-0.5 rounded-lg bg-gray-800 p-1 shadow-lg">
        {/* Block type dropdown — H1-H6, Odstavec, Citace */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 gap-1 px-2 text-xs text-white/90 hover:bg-white/10 hover:text-white">
              {dropdownLabel}
              <ChevronDown className="h-3 w-3 text-white/50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="border-gray-700 bg-gray-800">
            {BLOCK_TYPE_OPTIONS.map(({ type, label }) => (
              <DropdownMenuItem className="text-white/90 focus:bg-white/10 focus:text-white" key={type} onClick={() => formatBlock(type)}>
                {type === "quote" && <TextQuote className="mr-2 h-4 w-4" />}
                {label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="mx-0.5 h-4 w-px bg-white/20" />

        {/* Bold */}
        <Button
          variant="ghost"
          size="sm"
          className={`h-8 w-8 p-0 text-white/90 hover:bg-white/10 hover:text-white ${isBold ? "bg-white/20" : ""}`}
          onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold")}
          title="Tučné"
        >
          <Bold className="h-4 w-4" />
        </Button>

        {/* Italic */}
        <Button
          variant="ghost"
          size="sm"
          className={`h-8 w-8 p-0 text-white/90 hover:bg-white/10 hover:text-white ${isItalic ? "bg-white/20" : ""}`}
          onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic")}
          title="Kurzíva"
        >
          <Italic className="h-4 w-4" />
        </Button>

        <div className="mx-0.5 h-4 w-px bg-white/20" />

        {/* Alignment dropdown — one icon with arrow */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={`h-8 gap-0.5 px-1.5 text-white/90 hover:bg-white/10 hover:text-white ${elementFormat && elementFormat !== "left" ? "bg-white/20" : ""}`}
              title="Zarovnání"
            >
              <CurrentAlignIcon className="h-4 w-4" />
              <ChevronDown className="h-3 w-3 text-white/50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="flex min-w-0 gap-1 border-gray-700 bg-gray-800 p-1">
            <Button
              variant="ghost"
              size="sm"
              className={`h-8 w-8 p-0 text-white/90 hover:bg-white/10 hover:text-white ${elementFormat === "" || elementFormat === "left" ? "bg-white/20" : ""}`}
              onClick={() => formatAlignment("left")}
              title="Vlevo"
            >
              <AlignLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`h-8 w-8 p-0 text-white/90 hover:bg-white/10 hover:text-white ${elementFormat === "center" ? "bg-white/20" : ""}`}
              onClick={() => formatAlignment("center")}
              title="Na střed"
            >
              <AlignCenter className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`h-8 w-8 p-0 text-white/90 hover:bg-white/10 hover:text-white ${elementFormat === "right" ? "bg-white/20" : ""}`}
              onClick={() => formatAlignment("right")}
              title="Vpravo"
            >
              <AlignRight className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`h-8 w-8 p-0 text-white/90 hover:bg-white/10 hover:text-white ${elementFormat === "justify" ? "bg-white/20" : ""}`}
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
              variant="ghost"
              size="sm"
              className={`h-8 gap-0.5 px-1.5 text-white/90 hover:bg-white/10 hover:text-white ${isList ? "bg-white/20" : ""}`}
              title="Seznam"
            >
              <CurrentListIcon className="h-4 w-4" />
              <ChevronDown className="h-3 w-3 text-white/50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="flex min-w-0 gap-1 border-gray-700 bg-gray-800 p-1">
            <Button
              variant="ghost"
              size="sm"
              className={`h-8 w-8 p-0 text-white/90 hover:bg-white/10 hover:text-white ${isList && listType === "ul" ? "bg-white/20" : ""}`}
              onClick={() => formatBlock("ul")}
              title="Seznam"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`h-8 w-8 p-0 text-white/90 hover:bg-white/10 hover:text-white ${isList && listType === "ol" ? "bg-white/20" : ""}`}
              onClick={() => formatBlock("ol")}
              title="Číslovaný seznam"
            >
              <ListOrdered className="h-4 w-4" />
            </Button>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="mx-0.5 h-4 w-px bg-white/20" />

        {/* Link */}
        <Button
          variant="ghost"
          size="sm"
          className={`h-8 w-8 p-0 text-white/90 hover:bg-white/10 hover:text-white ${isLink ? "bg-white/20" : ""}`}
          onClick={insertLink}
          title="Odkaz"
        >
          <Link className="h-4 w-4" />
        </Button>

        <div className="mx-0.5 h-4 w-px bg-white/20" />

        {/* Toggle extras arrow */}
        <Button
          variant="ghost"
          size="sm"
          className={`h-8 w-8 p-0 text-white/90 hover:bg-white/10 hover:text-white ${showExtras ? "bg-white/20" : ""}`}
          onClick={() => setShowExtras(!showExtras)}
          title="Další možnosti"
        >
          <ChevronRight className={`h-4 w-4 transition-transform ${showExtras ? "rotate-90" : ""}`} />
        </Button>

        {/* Arrow pointer — only when extras row is closed */}
        {!showExtras && (
          <div className="absolute left-1/2 -bottom-1.5 -translate-x-1/2 h-0 w-0 border-x-[6px] border-t-[6px] border-x-transparent border-t-gray-800" />
        )}
      </div>

      {/* Extras row — font color, font size, indent */}
      {showExtras && (
        <div className="relative flex items-center gap-0.5 rounded-lg bg-gray-800 p-1 shadow-lg">
          {/* Font color — "A" with color indicator + dropdown */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-0.5 px-1.5 text-white/90 hover:bg-white/10 hover:text-white"
                title="Barva písma"
              >
                <span className="relative flex flex-col items-center">
                  <span className="text-sm font-bold leading-none" style={{ color: effectiveColor }}>A</span>
                  <span
                    className="mt-0.5 h-0.5 w-3.5 rounded-full"
                    style={{ backgroundColor: effectiveColor }}
                  />
                </span>
                <ChevronDown className="h-3 w-3 text-white/50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-3" side="bottom" align="start">
              <div className="grid grid-cols-8 gap-1">
                {COLOR_PALETTE.map((color, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`h-6 w-6 rounded border transition-transform hover:scale-110 ${
                      color === null
                        ? `relative overflow-hidden border-gray-300 bg-white${!fontColor ? " border-2 !border-[rgb(6,93,77)] ring-1 ring-[rgb(6,93,77)]" : ""}`
                        : fontColor === color
                          ? "border-2 border-[rgb(6,93,77)] ring-1 ring-[rgb(6,93,77)]"
                          : "border-gray-200"
                    }`}
                    style={color ? { backgroundColor: color } : undefined}
                    onClick={() => applyFontColor(color)}
                    title={color ?? "Výchozí barva"}
                  >
                    {color === null && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="h-[141%] w-px rotate-45 bg-red-500" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <div className="mx-0.5 h-4 w-px bg-white/20" />

          {/* Font size: A- | percentage dropdown | A+ */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-white/90 hover:bg-white/10 hover:text-white"
            onClick={() => adjustFontSize("down")}
            title="Zmenšit písmo"
          >
            <span style={{ fontSize: "12px", fontWeight: "bold", color: "inherit" }}>A-</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 gap-0.5 px-1.5 text-xs text-white/90 hover:bg-white/10 hover:text-white">
                {fontSizeDisplay}
                <ChevronDown className="h-3 w-3 text-white/50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="max-h-60 overflow-y-auto border-gray-700 bg-gray-800">
              <DropdownMenuItem className="text-white/90 focus:bg-white/10 focus:text-white" onClick={() => applyFontSize(null)}>
                Výchozí
              </DropdownMenuItem>
              {FONT_SIZE_OPTIONS.map((size) => (
                <DropdownMenuItem className="text-white/90 focus:bg-white/10 focus:text-white" key={size} onClick={() => applyFontSize(size)}>
                  {size}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-white/90 hover:bg-white/10 hover:text-white"
            onClick={() => adjustFontSize("up")}
            title="Zvětšit písmo"
          >
            <span style={{ fontSize: "12px", fontWeight: "bold", color: "inherit" }}>A+</span>
          </Button>

          <div className="mx-0.5 h-4 w-px bg-white/20" />

          {/* Indent / Outdent */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-white/90 hover:bg-white/10 hover:text-white"
            onClick={() => editor.dispatchCommand(OUTDENT_CONTENT_COMMAND, undefined)}
            title="Zmenšit odsazení"
          >
            <Outdent className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-white/90 hover:bg-white/10 hover:text-white"
            onClick={() => editor.dispatchCommand(INDENT_CONTENT_COMMAND, undefined)}
            title="Zvětšit odsazení"
          >
            <Indent className="h-4 w-4" />
          </Button>

          {/* Arrow pointer */}
          <div className="absolute left-1/2 -bottom-1.5 -translate-x-1/2 h-0 w-0 border-x-[6px] border-t-[6px] border-x-transparent border-t-gray-800" />
        </div>
      )}
    </div>
  );
}
