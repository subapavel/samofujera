"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $createParagraphNode,
  $getRoot,
  type LexicalNode,
  type NodeKey,
} from "lexical";
import { $createImageNode } from "../nodes/ImageNode";
import { $createButtonNode } from "../nodes/ButtonNode";
import { $createSeparatorNode } from "../nodes/SeparatorNode";
import { Popover, PopoverTrigger, PopoverContent } from "@samofujera/ui";
import { Type, ImageIcon, Minus, MousePointerClick, Plus } from "lucide-react";

interface GapPosition {
  afterKey: NodeKey | null;
  top: number;
}

interface BlockOption {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  insert: (afterKey: NodeKey | null) => void;
}

export function InsertBlockPlugin() {
  const [editor] = useLexicalComposerContext();
  const [gaps, setGaps] = useState<GapPosition[]>([]);
  const overlayRef = useRef<HTMLDivElement>(null);

  const computeGaps = useCallback(() => {
    const rootElement = editor.getRootElement();
    if (!rootElement || !overlayRef.current) return;

    const overlayRect = overlayRef.current.getBoundingClientRect();

    editor.getEditorState().read(() => {
      const root = $getRoot();
      const children = root.getChildren();
      const newGaps: GapPosition[] = [];

      if (children.length === 0) {
        newGaps.push({ afterKey: null, top: 16 });
        setGaps(newGaps);
        return;
      }

      for (let i = 0; i <= children.length; i++) {
        if (i === 0) {
          // Only show gap before first child when there are multiple children
          if (children.length > 1) {
            const firstEl = editor.getElementByKey(children[0].__key);
            if (firstEl) {
              const rect = firstEl.getBoundingClientRect();
              newGaps.push({
                afterKey: null,
                top: rect.top - overlayRect.top,
              });
            }
          }
        } else {
          const prevEl = editor.getElementByKey(children[i - 1].__key);
          if (prevEl) {
            const prevRect = prevEl.getBoundingClientRect();
            if (i < children.length) {
              const nextEl = editor.getElementByKey(children[i].__key);
              if (nextEl) {
                const nextRect = nextEl.getBoundingClientRect();
                const midY =
                  (prevRect.bottom + nextRect.top) / 2 - overlayRect.top;
                newGaps.push({
                  afterKey: children[i - 1].__key,
                  top: midY,
                });
              }
            } else {
              newGaps.push({
                afterKey: children[i - 1].__key,
                top: prevRect.bottom - overlayRect.top + 8,
              });
            }
          }
        }
      }

      setGaps(newGaps);
    });
  }, [editor]);

  useEffect(() => {
    return editor.registerUpdateListener(() => {
      requestAnimationFrame(computeGaps);
    });
  }, [editor, computeGaps]);

  useEffect(() => {
    window.addEventListener("resize", computeGaps);
    return () => window.removeEventListener("resize", computeGaps);
  }, [computeGaps]);

  const insertNode = useCallback(
    (afterKey: NodeKey | null, createNode: () => LexicalNode, focusNew = false) => {
      editor.update(() => {
        const root = $getRoot();
        const newNode = createNode();
        const isDecorator = newNode.getType() !== "paragraph"
          && newNode.getType() !== "heading"
          && newNode.getType() !== "list";

        if (afterKey === null) {
          const firstChild = root.getFirstChild();
          if (firstChild) {
            firstChild.insertBefore(newNode);
          } else {
            root.append(newNode);
          }
        } else {
          const afterNode = root
            .getChildren()
            .find((child) => child.__key === afterKey);
          if (afterNode) {
            afterNode.insertAfter(newNode);
          }
        }

        // Decorator nodes need a trailing paragraph for cursor placement
        if (isDecorator) {
          newNode.insertAfter($createParagraphNode());
        }

        // Focus the new paragraph node
        if (focusNew) {
          newNode.selectStart();
        }
      });
    },
    [editor],
  );

  const blockOptions: BlockOption[] = [
    {
      label: "Text",
      icon: Type,
      insert: (afterKey) => insertNode(afterKey, () => $createParagraphNode(), true),
    },
    {
      label: "Obrázek",
      icon: ImageIcon,
      insert: (afterKey) => insertNode(afterKey, () => $createImageNode()),
    },
    {
      label: "Dělicí čára",
      icon: Minus,
      insert: (afterKey) => insertNode(afterKey, () => $createSeparatorNode()),
    },
    {
      label: "Tlačítko",
      icon: MousePointerClick,
      insert: (afterKey) => insertNode(afterKey, () => $createButtonNode()),
    },
  ];

  return (
    <div
      ref={overlayRef}
      className="pointer-events-none absolute inset-0"
      style={{ zIndex: 10 }}
    >
      {gaps.map((gap, index) => (
        <GapHandle
          key={`gap-${gap.afterKey ?? "top"}-${index}`}
          gap={gap}
          blockOptions={blockOptions}
        />
      ))}
    </div>
  );
}

function GapHandle({
  gap,
  blockOptions,
}: {
  gap: GapPosition;
  blockOptions: BlockOption[];
}) {
  const [hovered, setHovered] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);

  const active = hovered || popoverOpen;

  return (
    <div
      className="absolute left-0 right-0 flex items-center justify-center"
      style={{ top: gap.top - 12, height: 24 }}
    >
      {/* Horizontal line — only visible on hover */}
      <div
        className="pointer-events-none absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-[rgb(6,93,77)]/40 transition-opacity duration-150"
        style={{ opacity: active ? 1 : 0 }}
      />

      {/* + button — always slightly visible, pointer-events-auto so it's hoverable */}
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <button
            className="pointer-events-auto relative z-10 flex h-6 w-6 items-center justify-center rounded-full border border-[rgb(6,93,77)] bg-white text-[rgb(6,93,77)] transition-all duration-150 hover:bg-[rgb(6,93,77)] hover:text-white"
            style={{ opacity: active ? 1 : 0.25 }}
            type="button"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3" side="bottom" align="center">
          <p className="mb-2 text-sm font-semibold">
            Přidat obsah
          </p>
          <div className="grid grid-cols-2 gap-2">
            {blockOptions.map((option) => (
              <button
                key={option.label}
                type="button"
                className="flex flex-col items-center gap-1.5 rounded-lg border border-[var(--border)] p-3 text-xs font-medium transition-colors hover:border-[rgb(6,93,77)] hover:bg-[rgb(6,93,77)]/5"
                onClick={() => {
                  option.insert(gap.afterKey);
                  setPopoverOpen(false);
                }}
              >
                <option.icon className="h-5 w-5 text-[var(--muted-foreground)]" />
                {option.label}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
