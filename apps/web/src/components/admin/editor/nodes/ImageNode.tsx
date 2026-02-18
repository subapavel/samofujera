"use client";

import { type JSX, useState } from "react";
import {
  DecoratorNode,
  type DOMConversionMap,
  type DOMExportOutput,
  type EditorConfig,
  type LexicalEditor,
  type LexicalNode,
  type NodeKey,
  type SerializedLexicalNode,
  type Spread,
} from "lexical";

export type ImageAlignment = "left" | "center" | "right" | "full";

export type SerializedImageNode = Spread<
  {
    src: string;
    altText: string;
    alignment: ImageAlignment;
    mediaItemId: string | null;
  },
  SerializedLexicalNode
>;

function ImageComponent({
  src,
  altText,
  alignment,
  nodeKey,
  editor,
}: {
  src: string;
  altText: string;
  alignment: ImageAlignment;
  nodeKey: NodeKey;
  editor: LexicalEditor;
}) {
  const [isSelected, setIsSelected] = useState(false);

  const alignClasses: Record<ImageAlignment, string> = {
    left: "mr-auto",
    center: "mx-auto",
    right: "ml-auto",
    full: "w-full",
  };

  function handleAlignmentChange(newAlignment: ImageAlignment) {
    editor.update(() => {
      const node = $getNodeByKey(nodeKey);
      if ($isImageNode(node)) {
        node.setAlignment(newAlignment);
      }
    });
  }

  return (
    <div
      className={`relative my-4 ${isSelected ? "ring-2 ring-[rgb(6,93,77)] ring-offset-2 rounded" : ""}`}
      onClick={() => setIsSelected(!isSelected)}
    >
      {src ? (
        <img
          src={src}
          alt={altText}
          className={`max-w-full rounded ${alignClasses[alignment]}`}
          style={{ display: "block" }}
        />
      ) : (
        <div
          className={`flex h-48 items-center justify-center rounded border-2 border-dashed border-[var(--border)] bg-[var(--muted)] ${alignClasses[alignment]}`}
        >
          <span className="text-[var(--muted-foreground)]">Klikni pro vlozeni obrazku</span>
        </div>
      )}
      {isSelected && (
        <div className="absolute -top-10 left-1/2 flex -translate-x-1/2 gap-1 rounded-lg border border-[var(--border)] bg-[var(--card)] p-1 shadow-lg">
          {(["left", "center", "right", "full"] as ImageAlignment[]).map((a) => (
            <button
              key={a}
              className={`rounded px-2 py-1 text-xs ${alignment === a ? "bg-[rgb(6,93,77)] text-white" : "hover:bg-[var(--accent)]"}`}
              onClick={(e) => {
                e.stopPropagation();
                handleAlignmentChange(a);
              }}
            >
              {a}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Import this separately since it depends on Lexical internals
import { $getNodeByKey } from "lexical";

export class ImageNode extends DecoratorNode<JSX.Element> {
  __src: string;
  __altText: string;
  __alignment: ImageAlignment;
  __mediaItemId: string | null;

  static getType(): string {
    return "image";
  }

  static clone(node: ImageNode): ImageNode {
    return new ImageNode(
      node.__src,
      node.__altText,
      node.__alignment,
      node.__mediaItemId,
      node.__key,
    );
  }

  constructor(
    src: string,
    altText: string,
    alignment: ImageAlignment = "center",
    mediaItemId: string | null = null,
    key?: NodeKey,
  ) {
    super(key);
    this.__src = src;
    this.__altText = altText;
    this.__alignment = alignment;
    this.__mediaItemId = mediaItemId;
  }

  createDOM(_config: EditorConfig): HTMLElement {
    const div = document.createElement("div");
    return div;
  }

  updateDOM(): boolean {
    return false;
  }

  setAlignment(alignment: ImageAlignment): void {
    const writable = this.getWritable();
    writable.__alignment = alignment;
  }

  setSrc(src: string): void {
    const writable = this.getWritable();
    writable.__src = src;
  }

  setAltText(altText: string): void {
    const writable = this.getWritable();
    writable.__altText = altText;
  }

  setMediaItemId(id: string | null): void {
    const writable = this.getWritable();
    writable.__mediaItemId = id;
  }

  static importJSON(serializedNode: SerializedImageNode): ImageNode {
    return $createImageNode(
      serializedNode.src,
      serializedNode.altText,
      serializedNode.alignment,
      serializedNode.mediaItemId,
    );
  }

  exportJSON(): SerializedImageNode {
    return {
      type: "image",
      version: 1,
      src: this.__src,
      altText: this.__altText,
      alignment: this.__alignment,
      mediaItemId: this.__mediaItemId,
    };
  }

  decorate(editor: LexicalEditor): JSX.Element {
    return (
      <ImageComponent
        src={this.__src}
        altText={this.__altText}
        alignment={this.__alignment}
        nodeKey={this.__key}
        editor={editor}
      />
    );
  }
}

export function $createImageNode(
  src: string = "",
  altText: string = "",
  alignment: ImageAlignment = "center",
  mediaItemId: string | null = null,
): ImageNode {
  return new ImageNode(src, altText, alignment, mediaItemId);
}

export function $isImageNode(
  node: LexicalNode | null | undefined,
): node is ImageNode {
  return node instanceof ImageNode;
}
