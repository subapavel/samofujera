"use client";

import { forwardRef } from "react";
import type { SerializedEditorState } from "lexical";
import { PageEditor, type SectionEditorHandle } from "../PageEditor";

interface TextBlockEditorProps {
  content: SerializedEditorState | null;
  onChange: (content: SerializedEditorState) => void;
  onFocus?: () => void;
  onActiveChange?: (active: boolean) => void;
  onDelete?: () => void;
  onCopy?: () => void;
}

export const TextBlockEditor = forwardRef<SectionEditorHandle, TextBlockEditorProps>(
  function TextBlockEditor({ content, onChange, onFocus, onActiveChange, onDelete, onCopy }, ref) {
    return (
      <PageEditor
        ref={ref}
        initialContent={content}
        onChange={onChange}
        onFocus={onFocus}
        onActiveChange={onActiveChange}
        onDelete={onDelete}
        onCopy={onCopy}
      />
    );
  },
);
