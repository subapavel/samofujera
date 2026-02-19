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
import { InsertBlockPlugin } from "./plugins/InsertBlockPlugin";
import { ImageNode } from "./nodes/ImageNode";
import { ButtonNode } from "./nodes/ButtonNode";
import { SeparatorNode } from "./nodes/SeparatorNode";
import { ColumnsNode } from "./nodes/ColumnsNode";
import { GalleryNode } from "./nodes/GalleryNode";
import { ContactFormNode } from "./nodes/ContactFormNode";

interface PageEditorProps {
  initialContent: SerializedEditorState | null;
  onChange: (state: SerializedEditorState) => void;
}

function isValidEditorState(content: SerializedEditorState | null): content is SerializedEditorState {
  if (!content) return false;
  // Must have a root with children to be a valid Lexical state
  const root = (content as Record<string, unknown>).root;
  return root != null && typeof root === "object";
}

export function PageEditor({ initialContent, onChange }: PageEditorProps) {
  const validContent = isValidEditorState(initialContent) ? initialContent : null;

  const initialConfig = {
    namespace: "PageEditor",
    theme: editorTheme,
    nodes: [
      HeadingNode,
      ListNode,
      ListItemNode,
      LinkNode,
      ImageNode,
      ButtonNode,
      SeparatorNode,
      ColumnsNode,
      GalleryNode,
      ContactFormNode,
    ],
    editorState: validContent ? JSON.stringify(validContent) : undefined,
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
          <div className="relative max-w-[935px] mx-auto px-5">
            <RichTextPlugin
              contentEditable={
                <ContentEditable className="outline-none focus:outline-none" />
              }
              ErrorBoundary={LexicalErrorBoundary}
            />
            <InsertBlockPlugin />
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
