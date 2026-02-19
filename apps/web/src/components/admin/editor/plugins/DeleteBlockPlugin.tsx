"use client";

import { useEffect } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $getSelection,
  $isNodeSelection,
  KEY_BACKSPACE_COMMAND,
  KEY_DELETE_COMMAND,
  COMMAND_PRIORITY_LOW,
} from "lexical";

/**
 * Handles Backspace/Delete for decorator nodes (ImageNode, ButtonNode, SeparatorNode).
 * Lexical's built-in handling doesn't remove DecoratorNodes on key press,
 * so we listen for the commands and remove selected nodes manually.
 */
export function DeleteBlockPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const handleDelete = () => {
      const selection = $getSelection();
      if (!$isNodeSelection(selection)) return false;

      const nodes = selection.getNodes();
      if (nodes.length === 0) return false;

      for (const node of nodes) {
        node.remove();
      }
      return true;
    };

    const unregisterBackspace = editor.registerCommand(
      KEY_BACKSPACE_COMMAND,
      handleDelete,
      COMMAND_PRIORITY_LOW,
    );

    const unregisterDelete = editor.registerCommand(
      KEY_DELETE_COMMAND,
      handleDelete,
      COMMAND_PRIORITY_LOW,
    );

    return () => {
      unregisterBackspace();
      unregisterDelete();
    };
  }, [editor]);

  return null;
}
