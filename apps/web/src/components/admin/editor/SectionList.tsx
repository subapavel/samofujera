"use client";

import { useCallback, useRef, useImperativeHandle, forwardRef, useState } from "react";
import type { SerializedEditorState } from "lexical";
import type { PageSection, ContentBlock, TextBlock } from "./types";
import {
  createDefaultSection,
  createTextBlock,
  createImageBlock,
  createSeparatorBlock,
  createButtonBlock,
} from "./types";
import type { ElementType } from "./plugins/ElementPickerPopover";
import { SectionWrapper } from "./SectionWrapper";
import {
  BlockWrapper,
  TextBlockEditor,
  ImageBlockEditor,
  SeparatorBlockEditor,
  ButtonBlockEditor,
} from "./blocks";
import type { SectionEditorHandle } from "./PageEditor";

interface SectionListProps {
  sections: PageSection[];
  onSectionsChange: (sections: PageSection[]) => void;
  onUndoRedoChange?: (canUndo: boolean, canRedo: boolean) => void;
  onFocusedSectionChange?: (index: number) => void;
  textEditorRefs: React.RefObject<Map<string, SectionEditorHandle>>;
}

export interface SectionListHandle {
  undo: () => boolean;
  redo: () => boolean;
  canUndo: boolean;
  canRedo: boolean;
}

function createBlockFromType(type: ElementType): ContentBlock {
  switch (type) {
    case "paragraph":
      return createTextBlock();
    case "image":
      return createImageBlock();
    case "separator":
      return createSeparatorBlock();
    case "button":
      return createButtonBlock();
  }
}

export const SectionList = forwardRef<SectionListHandle, SectionListProps>(
  function SectionList({ sections, onSectionsChange, onUndoRedoChange, onFocusedSectionChange, textEditorRefs }, ref) {
    const undoStack = useRef<PageSection[][]>([]);
    const redoStack = useRef<PageSection[][]>([]);
    const onUndoRedoChangeRef = useRef(onUndoRedoChange);
    onUndoRedoChangeRef.current = onUndoRedoChange;

    // Track which block is active (for border state)
    const [activeBlockId, setActiveBlockId] = useState<string | null>(null);

    const notifyUndoRedo = useCallback(() => {
      onUndoRedoChangeRef.current?.(
        undoStack.current.length > 0,
        redoStack.current.length > 0,
      );
    }, []);

    const pushUndo = useCallback(
      (current: PageSection[]) => {
        undoStack.current.push(JSON.parse(JSON.stringify(current)));
        redoStack.current = [];
        if (undoStack.current.length > 50) {
          undoStack.current.shift();
        }
        notifyUndoRedo();
      },
      [notifyUndoRedo],
    );

    // ── Section operations ──

    const handleAddSection = useCallback(
      (afterIndex: number) => {
        pushUndo(sections);
        const newSection = createDefaultSection();
        const newSections = [...sections];
        newSections.splice(afterIndex + 1, 0, newSection);
        onSectionsChange(newSections);
      },
      [sections, onSectionsChange, pushUndo],
    );

    const handleDeleteSection = useCallback(
      (index: number) => {
        pushUndo(sections);
        const newSections = sections.filter((_, i) => i !== index);
        if (newSections.length === 0) {
          newSections.push(createDefaultSection());
        }
        onSectionsChange(newSections);
      },
      [sections, onSectionsChange, pushUndo],
    );

    // ── Block operations ──

    const handleBlockChange = useCallback(
      (sectionIndex: number, blockIndex: number, updatedBlock: ContentBlock) => {
        const newSections = sections.map((section, si) => {
          if (si !== sectionIndex) return section;
          return {
            ...section,
            blocks: section.blocks.map((block, bi) =>
              bi === blockIndex ? updatedBlock : block,
            ),
          };
        });
        onSectionsChange(newSections);
      },
      [sections, onSectionsChange],
    );

    const handleTextBlockChange = useCallback(
      (sectionIndex: number, blockId: string, content: SerializedEditorState) => {
        const newSections = sections.map((section, si) => {
          if (si !== sectionIndex) return section;
          return {
            ...section,
            blocks: section.blocks.map((block) =>
              block.id === blockId ? { ...block, content } as TextBlock : block,
            ),
          };
        });
        onSectionsChange(newSections);
      },
      [sections, onSectionsChange],
    );

    const handleAddBlock = useCallback(
      (sectionIndex: number, afterBlockIndex: number, type: ElementType) => {
        pushUndo(sections);
        const newBlock = createBlockFromType(type);
        const newSections = sections.map((section, si) => {
          if (si !== sectionIndex) return section;
          const newBlocks = [...section.blocks];
          newBlocks.splice(afterBlockIndex + 1, 0, newBlock);
          return { ...section, blocks: newBlocks };
        });
        onSectionsChange(newSections);
      },
      [sections, onSectionsChange, pushUndo],
    );

    const handleAddBlockBefore = useCallback(
      (sectionIndex: number, beforeBlockIndex: number, type: ElementType) => {
        pushUndo(sections);
        const newBlock = createBlockFromType(type);
        const newSections = sections.map((section, si) => {
          if (si !== sectionIndex) return section;
          const newBlocks = [...section.blocks];
          newBlocks.splice(beforeBlockIndex, 0, newBlock);
          return { ...section, blocks: newBlocks };
        });
        onSectionsChange(newSections);
      },
      [sections, onSectionsChange, pushUndo],
    );

    // ── Undo / Redo ──

    const undo = useCallback(() => {
      if (undoStack.current.length === 0) return false;
      redoStack.current.push(JSON.parse(JSON.stringify(sections)));
      const prev = undoStack.current.pop()!;
      onSectionsChange(prev);
      notifyUndoRedo();
      return true;
    }, [sections, onSectionsChange, notifyUndoRedo]);

    const redo = useCallback(() => {
      if (redoStack.current.length === 0) return false;
      undoStack.current.push(JSON.parse(JSON.stringify(sections)));
      const next = redoStack.current.pop()!;
      onSectionsChange(next);
      notifyUndoRedo();
      return true;
    }, [sections, onSectionsChange, notifyUndoRedo]);

    useImperativeHandle(ref, () => ({
      undo,
      redo,
      get canUndo() { return undoStack.current.length > 0; },
      get canRedo() { return redoStack.current.length > 0; },
    }), [undo, redo]);

    return (
      <div>
        {sections.map((section, sectionIndex) => (
          <SectionWrapper
            key={section.id}
            sectionId={section.id}
            onDelete={() => handleDeleteSection(sectionIndex)}
            onAddBefore={() => handleAddSection(sectionIndex - 1)}
            onAddAfter={() => handleAddSection(sectionIndex)}
          >
            <div>
              {section.blocks.map((block, blockIndex) => (
                <BlockWrapper
                  key={block.id}
                  isActive={activeBlockId === block.id}
                  onAddBefore={(type) => handleAddBlockBefore(sectionIndex, blockIndex, type)}
                  onAddAfter={(type) => handleAddBlock(sectionIndex, blockIndex, type)}
                >
                  {block.type === "text" && (
                    <TextBlockEditor
                      ref={(handle) => {
                        if (handle) {
                          textEditorRefs.current?.set(block.id, handle);
                        } else {
                          textEditorRefs.current?.delete(block.id);
                        }
                      }}
                      content={block.content}
                      onChange={(content) => handleTextBlockChange(sectionIndex, block.id, content)}
                      onFocus={() => onFocusedSectionChange?.(sectionIndex)}
                      onActiveChange={(active) => {
                        if (active) {
                          setActiveBlockId(block.id);
                        } else if (activeBlockId === block.id) {
                          setActiveBlockId(null);
                        }
                      }}
                    />
                  )}
                  {block.type === "image" && (
                    <ImageBlockEditor
                      block={block}
                      onChange={(updated) => handleBlockChange(sectionIndex, blockIndex, updated)}
                    />
                  )}
                  {block.type === "separator" && (
                    <SeparatorBlockEditor
                      block={block}
                      onChange={(updated) => handleBlockChange(sectionIndex, blockIndex, updated)}
                    />
                  )}
                  {block.type === "button" && (
                    <ButtonBlockEditor
                      block={block}
                      onChange={(updated) => handleBlockChange(sectionIndex, blockIndex, updated)}
                    />
                  )}
                </BlockWrapper>
              ))}
            </div>
          </SectionWrapper>
        ))}
      </div>
    );
  },
);
