"use client";

import { type JSX, useState } from "react";
import {
  DecoratorNode,
  type EditorConfig,
  type LexicalEditor,
  type LexicalNode,
  type NodeKey,
  type SerializedLexicalNode,
  type Spread,
  $getNodeByKey,
} from "lexical";
import { BlockWrapper } from "./BlockWrapper";

export type SeparatorStyle = "simple" | "ornamental";

export type SerializedSeparatorNode = Spread<
  {
    separatorStyle: SeparatorStyle;
  },
  SerializedLexicalNode
>;

function SeparatorComponent({
  separatorStyle,
  nodeKey,
  editor,
}: {
  separatorStyle: SeparatorStyle;
  nodeKey: NodeKey;
  editor: LexicalEditor;
}) {
  const [isSelected, setIsSelected] = useState(false);

  function toggleStyle() {
    editor.update(() => {
      const node = $getNodeByKey(nodeKey);
      if ($isSeparatorNode(node)) {
        node.setSeparatorStyle(
          separatorStyle === "simple" ? "ornamental" : "simple",
        );
      }
    });
  }

  return (
    <BlockWrapper
      nodeKey={nodeKey}
      editor={editor}
      isSelected={isSelected}
      onSelect={() => setIsSelected(!isSelected)}
      className="my-8 cursor-pointer"
    >
      <div onDoubleClick={toggleStyle}>
        {separatorStyle === "simple" ? (
          <hr className="border-t border-[var(--border)]" />
        ) : (
          <div className="flex items-center justify-center gap-3">
            <div className="h-px flex-1 bg-[rgb(6,93,77)]/30" />
            <span className="text-[rgb(6,93,77)]">&#10043;</span>
            <div className="h-px flex-1 bg-[rgb(6,93,77)]/30" />
          </div>
        )}
        {isSelected && (
          <p className="mt-1 text-center text-xs text-[var(--muted-foreground)]">
            Dvakrát klikni pro změnu stylu
          </p>
        )}
      </div>
    </BlockWrapper>
  );
}

export class SeparatorNode extends DecoratorNode<JSX.Element> {
  __separatorStyle: SeparatorStyle;

  static getType(): string {
    return "separator";
  }

  static clone(node: SeparatorNode): SeparatorNode {
    return new SeparatorNode(node.__separatorStyle, node.__key);
  }

  constructor(separatorStyle: SeparatorStyle = "simple", key?: NodeKey) {
    super(key);
    this.__separatorStyle = separatorStyle;
  }

  createDOM(_config: EditorConfig): HTMLElement {
    const div = document.createElement("div");
    return div;
  }

  updateDOM(): boolean {
    return false;
  }

  setSeparatorStyle(style: SeparatorStyle): void {
    const writable = this.getWritable();
    writable.__separatorStyle = style;
  }

  static importJSON(serializedNode: SerializedSeparatorNode): SeparatorNode {
    return $createSeparatorNode(serializedNode.separatorStyle);
  }

  exportJSON(): SerializedSeparatorNode {
    return {
      type: "separator",
      version: 1,
      separatorStyle: this.__separatorStyle,
    };
  }

  decorate(editor: LexicalEditor): JSX.Element {
    return (
      <SeparatorComponent
        separatorStyle={this.__separatorStyle}
        nodeKey={this.__key}
        editor={editor}
      />
    );
  }
}

export function $createSeparatorNode(
  style: SeparatorStyle = "simple",
): SeparatorNode {
  return new SeparatorNode(style);
}

export function $isSeparatorNode(
  node: LexicalNode | null | undefined,
): node is SeparatorNode {
  return node instanceof SeparatorNode;
}
