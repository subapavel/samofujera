"use client";

import { useCallback, useRef, useImperativeHandle, forwardRef, type ReactNode } from "react";
import type { PageSection } from "./types";
import { SectionAddButton } from "./SectionAddButton";
import { SectionWrapper } from "./SectionWrapper";

interface SectionListProps {
  sections: PageSection[];
  onSectionsChange: (sections: PageSection[]) => void;
  renderSection: (section: PageSection, index: number) => ReactNode;
}

export interface SectionListHandle {
  undo: () => boolean;
  redo: () => boolean;
  canUndo: boolean;
  canRedo: boolean;
}

export const SectionList = forwardRef<SectionListHandle, SectionListProps>(
  function SectionList({ sections, onSectionsChange, renderSection }, ref) {
    const undoStack = useRef<PageSection[][]>([]);
    const redoStack = useRef<PageSection[][]>([]);

    function pushUndo(current: PageSection[]) {
      undoStack.current.push(JSON.parse(JSON.stringify(current)));
      redoStack.current = []; // clear redo on new action
      // Limit stack size
      if (undoStack.current.length > 50) {
        undoStack.current.shift();
      }
    }

    const handleAddSection = useCallback(
      (afterIndex: number) => {
        pushUndo(sections);
        const newSection: PageSection = {
          id: crypto.randomUUID(),
          content: null,
        };
        const newSections = [...sections];
        newSections.splice(afterIndex + 1, 0, newSection);
        onSectionsChange(newSections);
      },
      [sections, onSectionsChange],
    );

    const handleDeleteSection = useCallback(
      (index: number) => {
        if (sections.length <= 1) return; // Don't delete the last section
        pushUndo(sections);
        const newSections = sections.filter((_, i) => i !== index);
        onSectionsChange(newSections);
      },
      [sections, onSectionsChange],
    );

    const undo = useCallback(() => {
      if (undoStack.current.length === 0) return false;
      redoStack.current.push(JSON.parse(JSON.stringify(sections)));
      const prev = undoStack.current.pop()!;
      onSectionsChange(prev);
      return true;
    }, [sections, onSectionsChange]);

    const redo = useCallback(() => {
      if (redoStack.current.length === 0) return false;
      undoStack.current.push(JSON.parse(JSON.stringify(sections)));
      const next = redoStack.current.pop()!;
      onSectionsChange(next);
      return true;
    }, [sections, onSectionsChange]);

    useImperativeHandle(ref, () => ({
      undo,
      redo,
      get canUndo() { return undoStack.current.length > 0; },
      get canRedo() { return redoStack.current.length > 0; },
    }), [undo, redo]);

    return (
      <div className="space-y-2">
        {/* Add button before first section */}
        <SectionAddButton onAdd={() => handleAddSection(-1)} />

        {sections.map((section, index) => (
          <div key={section.id}>
            <SectionWrapper
              sectionId={section.id}
              onDelete={() => handleDeleteSection(index)}
            >
              {renderSection(section, index)}
            </SectionWrapper>

            {/* Add button after each section */}
            <SectionAddButton onAdd={() => handleAddSection(index)} />
          </div>
        ))}
      </div>
    );
  },
);
