"use client";

import { forwardRef } from "react";
import type { SerializedEditorState } from "lexical";
import { PageEditor, type SectionEditorHandle } from "../PageEditor";

interface TextBlockEditorProps {
  content: SerializedEditorState | null;
  onChange: (content: SerializedEditorState) => void;
  onFocus?: () => void;
  onActiveChange?: (active: boolean) => void;
}

export const TextBlockEditor = forwardRef<SectionEditorHandle, TextBlockEditorProps>(
  function TextBlockEditor({ content, onChange, onFocus, onActiveChange }, ref) {
    return (
      <PageEditor
        ref={ref}
        initialContent={content}
        onChange={onChange}
        onFocus={onFocus}
        onActiveChange={onActiveChange}
      />
    );
  },
);
