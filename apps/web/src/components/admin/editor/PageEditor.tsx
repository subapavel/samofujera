"use client";

import {
  forwardRef,
  useImperativeHandle,
  useCallback,
  useState,
  useEffect,
  useRef,
} from "react";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { ListNode, ListItemNode } from "@lexical/list";
import { LinkNode } from "@lexical/link";
import {
  UNDO_COMMAND,
  REDO_COMMAND,
  CAN_UNDO_COMMAND,
  CAN_REDO_COMMAND,
  SELECTION_CHANGE_COMMAND,
  COMMAND_PRIORITY_LOW,
  KEY_ENTER_COMMAND,
  COMMAND_PRIORITY_HIGH,
  INSERT_LINE_BREAK_COMMAND,
  $getSelection,
  $isRangeSelection,
} from "lexical";
import type { EditorState, SerializedEditorState } from "lexical";

import { editorTheme } from "./theme";
import { ToolbarPlugin } from "./plugins/ToolbarPlugin";
import { LinkEditorPlugin } from "./plugins/LinkEditorPlugin";

export interface SectionEditorHandle {
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

interface PageEditorProps {
  initialContent: SerializedEditorState | null;
  onChange: (state: SerializedEditorState) => void;
  onFocus?: () => void;
  onActiveChange?: (active: boolean) => void;
  onDelete?: () => void;
  onCopy?: () => void;
}

function isValidEditorState(
  content: SerializedEditorState | null,
): content is SerializedEditorState {
  if (!content) return false;
  const root = (content as unknown as Record<string, unknown>).root;
  return root != null && typeof root === "object";
}

/**
 * Internal plugin that tracks undo/redo availability and exposes
 * dispatch functions via a callback.
 */
function UndoRedoPlugin({
  onCanUndoChange,
  onCanRedoChange,
  onDispatchReady,
}: {
  onCanUndoChange: (canUndo: boolean) => void;
  onCanRedoChange: (canRedo: boolean) => void;
  onDispatchReady: (dispatch: { undo: () => void; redo: () => void }) => void;
}) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    onDispatchReady({
      undo: () => editor.dispatchCommand(UNDO_COMMAND, undefined),
      redo: () => editor.dispatchCommand(REDO_COMMAND, undefined),
    });
  }, [editor, onDispatchReady]);

  useEffect(() => {
    const unregisterUndo = editor.registerCommand(
      CAN_UNDO_COMMAND,
      (payload: boolean) => {
        onCanUndoChange(payload);
        return false;
      },
      COMMAND_PRIORITY_LOW,
    );

    const unregisterRedo = editor.registerCommand(
      CAN_REDO_COMMAND,
      (payload: boolean) => {
        onCanRedoChange(payload);
        return false;
      },
      COMMAND_PRIORITY_LOW,
    );

    return () => {
      unregisterUndo();
      unregisterRedo();
    };
  }, [editor, onCanUndoChange, onCanRedoChange]);

  return null;
}

/** Shift+Enter inserts a line break (<br>) instead of a new paragraph.
 *  Plain Enter uses Lexical defaults: new paragraph, new list item, etc. */
function ShiftEnterLineBreakPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand(
      KEY_ENTER_COMMAND,
      (event: KeyboardEvent | null) => {
        if (!event?.shiftKey) return false;
        event.preventDefault();
        editor.dispatchCommand(INSERT_LINE_BREAK_COMMAND, false);
        return true;
      },
      COMMAND_PRIORITY_HIGH,
    );
  }, [editor]);

  return null;
}

/** Tracks editor focus and notifies parent via onActiveChange. */
function FocusPlugin({
  onFocus,
  onActiveChange,
}: {
  onFocus?: () => void;
  onActiveChange?: (active: boolean) => void;
}) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      () => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          onFocus?.();
          onActiveChange?.(true);
        }
        return false;
      },
      COMMAND_PRIORITY_LOW,
    );
  }, [editor, onFocus, onActiveChange]);

  // Detect blur: when focus leaves the editor root
  useEffect(() => {
    const rootElement = editor.getRootElement();
    if (!rootElement) return;

    function handleFocusOut(e: FocusEvent) {
      const relatedTarget = e.relatedTarget as Node | null;
      // Stay active if focus moved to something inside the editor wrapper
      // (toolbar is a sibling, we check via closest parent)
      const wrapper = rootElement!.closest("[data-text-block-wrapper]");
      if (relatedTarget && wrapper?.contains(relatedTarget)) return;
      // Stay active if focus moved to Radix portal
      if (relatedTarget instanceof HTMLElement) {
        const portal = relatedTarget.closest(
          "[data-radix-popper-content-wrapper], [role='menu'], [data-radix-menu-content]",
        );
        if (portal) return;
      }
      onActiveChange?.(false);
    }

    rootElement.addEventListener("focusout", handleFocusOut);
    return () => rootElement.removeEventListener("focusout", handleFocusOut);
  }, [editor, onActiveChange]);

  return null;
}

export const PageEditor = forwardRef<SectionEditorHandle, PageEditorProps>(
  function PageEditor({ initialContent, onChange, onFocus, onActiveChange, onDelete, onCopy }, ref) {
    const validContent = isValidEditorState(initialContent)
      ? initialContent
      : null;

    const [canUndo, setCanUndo] = useState(false);
    const [canRedo, setCanRedo] = useState(false);
    const dispatchRef = useRef<{ undo: () => void; redo: () => void } | null>(
      null,
    );

    const handleCanUndoChange = useCallback((value: boolean) => {
      setCanUndo(value);
    }, []);

    const handleCanRedoChange = useCallback((value: boolean) => {
      setCanRedo(value);
    }, []);

    const handleDispatchReady = useCallback(
      (dispatch: { undo: () => void; redo: () => void }) => {
        dispatchRef.current = dispatch;
      },
      [],
    );

    useImperativeHandle(
      ref,
      () => ({
        undo: () => dispatchRef.current?.undo(),
        redo: () => dispatchRef.current?.redo(),
        get canUndo() {
          return canUndo;
        },
        get canRedo() {
          return canRedo;
        },
      }),
      [canUndo, canRedo],
    );

    const initialConfig = {
      namespace: "PageEditor",
      theme: editorTheme,
      nodes: [
        HeadingNode,
        QuoteNode,
        ListNode,
        ListItemNode,
        LinkNode,
      ],
      editorState: validContent ? JSON.stringify(validContent) : undefined,
      onError: (error: Error) => console.error("Lexical error:", error),
    };

    function handleChange(editorState: EditorState) {
      onChange(editorState.toJSON());
    }

    return (
      <LexicalComposer initialConfig={initialConfig}>
        <div data-text-block-wrapper="" className="page-content">
          <ToolbarPlugin onDelete={onDelete} onCopy={onCopy} />
          <LinkEditorPlugin />
          <RichTextPlugin
            contentEditable={
              <ContentEditable
                className="outline-none focus:outline-none"
              />
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
          <HistoryPlugin />
          <ListPlugin />
          <LinkPlugin />
          <ShiftEnterLineBreakPlugin />
          <OnChangePlugin onChange={handleChange} ignoreSelectionChange />
          <UndoRedoPlugin
            onCanUndoChange={handleCanUndoChange}
            onCanRedoChange={handleCanRedoChange}
            onDispatchReady={handleDispatchReady}
          />
          <FocusPlugin onFocus={onFocus} onActiveChange={onActiveChange} />
        </div>
      </LexicalComposer>
    );
  },
);
