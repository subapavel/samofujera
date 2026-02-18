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

export interface GalleryImage {
  mediaItemId: string;
  src: string;
  altText: string;
}

export type SerializedGalleryNode = Spread<
  {
    images: GalleryImage[];
    columns: 2 | 3 | 4;
  },
  SerializedLexicalNode
>;

function GalleryComponent({
  images,
  columns,
  nodeKey,
  editor,
}: {
  images: GalleryImage[];
  columns: 2 | 3 | 4;
  nodeKey: NodeKey;
  editor: LexicalEditor;
}) {
  const [isSelected, setIsSelected] = useState(false);

  function handleColumnsChange(count: 2 | 3 | 4) {
    editor.update(() => {
      const node = $getNodeByKey(nodeKey);
      if ($isGalleryNode(node)) {
        node.setColumns(count);
      }
    });
  }

  function handleRemoveImage(index: number) {
    editor.update(() => {
      const node = $getNodeByKey(nodeKey);
      if ($isGalleryNode(node)) {
        const newImages = images.filter((_, i) => i !== index);
        node.setImages(newImages);
      }
    });
  }

  const gridClass =
    columns === 2 ? "grid-cols-2" : columns === 3 ? "grid-cols-3" : "grid-cols-4";

  return (
    <div
      className={`my-6 ${isSelected ? "ring-2 ring-[rgb(6,93,77)] ring-offset-2 rounded" : ""}`}
      onClick={() => setIsSelected(!isSelected)}
    >
      {isSelected && (
        <div className="mb-2 flex justify-center gap-2">
          {([2, 3, 4] as const).map((c) => (
            <button
              key={c}
              className={`rounded px-3 py-1 text-xs ${columns === c ? "bg-[rgb(6,93,77)] text-white" : "border"}`}
              onClick={(e) => {
                e.stopPropagation();
                handleColumnsChange(c);
              }}
            >
              {c} sloupce
            </button>
          ))}
        </div>
      )}
      {images.length > 0 ? (
        <div className={`grid ${gridClass} gap-2`}>
          {images.map((img, i) => (
            <div key={i} className="relative aspect-square overflow-hidden rounded">
              <img
                src={img.src}
                alt={img.altText}
                className="h-full w-full object-cover"
              />
              {isSelected && (
                <button
                  className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveImage(i);
                  }}
                >
                  &times;
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex h-32 items-center justify-center rounded border-2 border-dashed border-[var(--border)] bg-[var(--muted)]">
          <span className="text-[var(--muted-foreground)]">
            Galerie — klikni pro pridani obrazku
          </span>
        </div>
      )}
    </div>
  );
}

export class GalleryNode extends DecoratorNode<JSX.Element> {
  __images: GalleryImage[];
  __columns: 2 | 3 | 4;

  static getType(): string {
    return "gallery";
  }

  static clone(node: GalleryNode): GalleryNode {
    return new GalleryNode([...node.__images], node.__columns, node.__key);
  }

  constructor(images: GalleryImage[] = [], columns: 2 | 3 | 4 = 3, key?: NodeKey) {
    super(key);
    this.__images = images;
    this.__columns = columns;
  }

  createDOM(_config: EditorConfig): HTMLElement {
    return document.createElement("div");
  }

  updateDOM(): boolean {
    return false;
  }

  setImages(images: GalleryImage[]): void {
    const writable = this.getWritable();
    writable.__images = images;
  }

  setColumns(columns: 2 | 3 | 4): void {
    const writable = this.getWritable();
    writable.__columns = columns;
  }

  static importJSON(serializedNode: SerializedGalleryNode): GalleryNode {
    return $createGalleryNode(serializedNode.images, serializedNode.columns);
  }

  exportJSON(): SerializedGalleryNode {
    return {
      type: "gallery",
      version: 1,
      images: this.__images,
      columns: this.__columns,
    };
  }

  decorate(editor: LexicalEditor): JSX.Element {
    return (
      <GalleryComponent
        images={this.__images}
        columns={this.__columns}
        nodeKey={this.__key}
        editor={editor}
      />
    );
  }
}

export function $createGalleryNode(
  images: GalleryImage[] = [],
  columns: 2 | 3 | 4 = 3,
): GalleryNode {
  return new GalleryNode(images, columns);
}

export function $isGalleryNode(
  node: LexicalNode | null | undefined,
): node is GalleryNode {
  return node instanceof GalleryNode;
}
