"use client";

import { type JSX, useState, useCallback } from "react";
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

export type SerializedColumnsNode = Spread<
  {
    columnCount: 2 | 3;
    columnContents: string[];
  },
  SerializedLexicalNode
>;

function ColumnsComponent({
  columnCount,
  columnContents,
  nodeKey,
  editor,
}: {
  columnCount: 2 | 3;
  columnContents: string[];
  nodeKey: NodeKey;
  editor: LexicalEditor;
}) {
  const [isSelected, setIsSelected] = useState(false);
  const [editingColumn, setEditingColumn] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");

  function handleColumnCountChange(count: 2 | 3) {
    editor.update(() => {
      const node = $getNodeByKey(nodeKey);
      if ($isColumnsNode(node)) {
        node.setColumnCount(count);
      }
    });
  }

  function handleColumnEdit(index: number) {
    setEditingColumn(index);
    setEditValue(columnContents[index] ?? "");
  }

  function handleColumnSave() {
    if (editingColumn === null) return;
    editor.update(() => {
      const node = $getNodeByKey(nodeKey);
      if ($isColumnsNode(node)) {
        const newContents = [...columnContents];
        newContents[editingColumn] = editValue;
        node.setColumnContents(newContents);
      }
    });
    setEditingColumn(null);
  }

  const gridClass = columnCount === 2 ? "grid-cols-2" : "grid-cols-3";

  return (
    <div
      className={`my-6 ${isSelected ? "ring-2 ring-[rgb(6,93,77)] ring-offset-2 rounded" : ""}`}
      onClick={() => setIsSelected(!isSelected)}
    >
      {isSelected && (
        <div className="mb-2 flex justify-center gap-2">
          <button
            className={`rounded px-3 py-1 text-xs ${columnCount === 2 ? "bg-[rgb(6,93,77)] text-white" : "border"}`}
            onClick={(e) => {
              e.stopPropagation();
              handleColumnCountChange(2);
            }}
          >
            2 sloupce
          </button>
          <button
            className={`rounded px-3 py-1 text-xs ${columnCount === 3 ? "bg-[rgb(6,93,77)] text-white" : "border"}`}
            onClick={(e) => {
              e.stopPropagation();
              handleColumnCountChange(3);
            }}
          >
            3 sloupce
          </button>
        </div>
      )}
      <div className={`grid ${gridClass} gap-4`}>
        {Array.from({ length: columnCount }).map((_, i) => (
          <div
            key={i}
            className="min-h-[100px] rounded border border-dashed border-[var(--border)] p-4"
            onClick={(e) => {
              e.stopPropagation();
              handleColumnEdit(i);
            }}
          >
            {editingColumn === i ? (
              <div>
                <textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full rounded border border-[var(--border)] p-2 text-sm"
                  rows={4}
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="mt-2 flex justify-end gap-1">
                  <button
                    className="rounded px-2 py-1 text-xs text-[var(--muted-foreground)]"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingColumn(null);
                    }}
                  >
                    Zrusit
                  </button>
                  <button
                    className="rounded bg-[rgb(6,93,77)] px-2 py-1 text-xs text-white"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleColumnSave();
                    }}
                  >
                    OK
                  </button>
                </div>
              </div>
            ) : (
              <div className="public-body-110">
                {columnContents[i] || (
                  <span className="text-[var(--muted-foreground)]">
                    Sloupec {i + 1} — klikni pro upravu
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export class ColumnsNode extends DecoratorNode<JSX.Element> {
  __columnCount: 2 | 3;
  __columnContents: string[];

  static getType(): string {
    return "columns";
  }

  static clone(node: ColumnsNode): ColumnsNode {
    return new ColumnsNode(node.__columnCount, [...node.__columnContents], node.__key);
  }

  constructor(columnCount: 2 | 3 = 2, columnContents: string[] = [], key?: NodeKey) {
    super(key);
    this.__columnCount = columnCount;
    this.__columnContents = columnContents.length >= columnCount
      ? columnContents
      : [...columnContents, ...Array(columnCount - columnContents.length).fill("")];
  }

  createDOM(_config: EditorConfig): HTMLElement {
    return document.createElement("div");
  }

  updateDOM(): boolean {
    return false;
  }

  setColumnCount(count: 2 | 3): void {
    const writable = this.getWritable();
    writable.__columnCount = count;
    while (writable.__columnContents.length < count) {
      writable.__columnContents.push("");
    }
  }

  setColumnContents(contents: string[]): void {
    const writable = this.getWritable();
    writable.__columnContents = contents;
  }

  static importJSON(serializedNode: SerializedColumnsNode): ColumnsNode {
    return $createColumnsNode(serializedNode.columnCount, serializedNode.columnContents);
  }

  exportJSON(): SerializedColumnsNode {
    return {
      type: "columns",
      version: 1,
      columnCount: this.__columnCount,
      columnContents: this.__columnContents,
    };
  }

  decorate(editor: LexicalEditor): JSX.Element {
    return (
      <ColumnsComponent
        columnCount={this.__columnCount}
        columnContents={this.__columnContents}
        nodeKey={this.__key}
        editor={editor}
      />
    );
  }
}

export function $createColumnsNode(
  columnCount: 2 | 3 = 2,
  columnContents: string[] = [],
): ColumnsNode {
  return new ColumnsNode(columnCount, columnContents);
}

export function $isColumnsNode(
  node: LexicalNode | null | undefined,
): node is ColumnsNode {
  return node instanceof ColumnsNode;
}
