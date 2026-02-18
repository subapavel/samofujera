"use client";

import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HeadingNode } from "@lexical/rich-text";
import { ListNode, ListItemNode } from "@lexical/list";
import { LinkNode } from "@lexical/link";
import type { EditorState, SerializedEditorState } from "lexical";

import { editorTheme } from "./theme";
import { ToolbarPlugin } from "./plugins/ToolbarPlugin";

interface PageEditorProps {
  initialContent: SerializedEditorState | null;
  onChange: (state: SerializedEditorState) => void;
}

export function PageEditor({ initialContent, onChange }: PageEditorProps) {
  const initialConfig = {
    namespace: "PageEditor",
    theme: editorTheme,
    nodes: [HeadingNode, ListNode, ListItemNode, LinkNode],
    editorState: initialContent ? JSON.stringify(initialContent) : undefined,
    onError: (error: Error) => console.error("Lexical error:", error),
  };

  function handleChange(editorState: EditorState) {
    onChange(editorState.toJSON());
  }

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className="relative">
        <ToolbarPlugin />
        <div
          className="bg-repeat px-6 sm:px-12 lg:px-16 pt-8 pb-12 min-h-[60vh]"
          style={{ backgroundImage: "url('/images/bg-body-texture.png')" }}
        >
          <div className="max-w-[935px] mx-auto px-5">
            <RichTextPlugin
              contentEditable={
                <ContentEditable className="outline-none focus:outline-none" />
              }
              ErrorBoundary={LexicalErrorBoundary}
            />
          </div>
        </div>
        <HistoryPlugin />
        <ListPlugin />
        <LinkPlugin />
        <OnChangePlugin onChange={handleChange} ignoreSelectionChange />
      </div>
    </LexicalComposer>
  );
}
