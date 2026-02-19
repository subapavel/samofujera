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

export type ButtonVariant = "primary" | "secondary";

export type SerializedButtonNode = Spread<
  {
    text: string;
    url: string;
    variant: ButtonVariant;
  },
  SerializedLexicalNode
>;

function ButtonComponent({
  text,
  url,
  variant,
  nodeKey,
  editor,
}: {
  text: string;
  url: string;
  variant: ButtonVariant;
  nodeKey: NodeKey;
  editor: LexicalEditor;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(text);
  const [editUrl, setEditUrl] = useState(url);
  const [editVariant, setEditVariant] = useState(variant);

  function handleSave() {
    editor.update(() => {
      const node = $getNodeByKey(nodeKey);
      if ($isButtonNode(node)) {
        node.setText(editText);
        node.setUrl(editUrl);
        node.setVariant(editVariant);
      }
    });
    setIsEditing(false);
  }

  const variantClasses: Record<ButtonVariant, string> = {
    primary:
      "bg-[rgb(6,93,77)] text-white hover:bg-[rgb(5,78,64)] px-8 py-3 rounded-lg font-semibold text-lg inline-block",
    secondary:
      "border-2 border-[rgb(6,93,77)] text-[rgb(6,93,77)] hover:bg-[rgb(6,93,77)] hover:text-white px-8 py-3 rounded-lg font-semibold text-lg inline-block",
  };

  return (
    <div className="my-6 text-center">
      {isEditing ? (
        <div className="mx-auto max-w-sm space-y-2 rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
          <input
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            placeholder="Text tlacitka"
            className="w-full rounded border border-[var(--border)] px-3 py-1.5 text-sm"
          />
          <input
            value={editUrl}
            onChange={(e) => setEditUrl(e.target.value)}
            placeholder="URL odkazu"
            className="w-full rounded border border-[var(--border)] px-3 py-1.5 text-sm"
          />
          <div className="flex gap-2">
            <button
              className={`flex-1 rounded px-2 py-1 text-xs ${editVariant === "primary" ? "bg-[rgb(6,93,77)] text-white" : "border"}`}
              onClick={() => setEditVariant("primary")}
            >
              Primarni
            </button>
            <button
              className={`flex-1 rounded px-2 py-1 text-xs ${editVariant === "secondary" ? "bg-[rgb(6,93,77)] text-white" : "border"}`}
              onClick={() => setEditVariant("secondary")}
            >
              Sekundarni
            </button>
          </div>
          <div className="flex justify-end gap-2">
            <button
              className="rounded px-3 py-1 text-xs text-[var(--muted-foreground)]"
              onClick={() => setIsEditing(false)}
            >
              Zrusit
            </button>
            <button
              className="rounded bg-[rgb(6,93,77)] px-3 py-1 text-xs text-white"
              onClick={handleSave}
            >
              Ulozit
            </button>
          </div>
        </div>
      ) : (
        <span
          className={`cursor-pointer ${variantClasses[variant]}`}
          onClick={() => setIsEditing(true)}
        >
          {text || "Klikni pro upravu tlacitka"}
        </span>
      )}
    </div>
  );
}

export class ButtonNode extends DecoratorNode<JSX.Element> {
  __text: string;
  __url: string;
  __variant: ButtonVariant;

  static getType(): string {
    return "cta-button";
  }

  static clone(node: ButtonNode): ButtonNode {
    return new ButtonNode(node.__text, node.__url, node.__variant, node.__key);
  }

  constructor(
    text: string = "Zjistit vice",
    url: string = "#",
    variant: ButtonVariant = "primary",
    key?: NodeKey,
  ) {
    super(key);
    this.__text = text;
    this.__url = url;
    this.__variant = variant;
  }

  createDOM(_config: EditorConfig): HTMLElement {
    const div = document.createElement("div");
    return div;
  }

  updateDOM(): boolean {
    return false;
  }

  setText(text: string): void {
    const writable = this.getWritable();
    writable.__text = text;
  }

  setUrl(url: string): void {
    const writable = this.getWritable();
    writable.__url = url;
  }

  setVariant(variant: ButtonVariant): void {
    const writable = this.getWritable();
    writable.__variant = variant;
  }

  static importJSON(serializedNode: SerializedButtonNode): ButtonNode {
    return $createButtonNode(
      serializedNode.text,
      serializedNode.url,
      serializedNode.variant,
    );
  }

  exportJSON(): SerializedButtonNode {
    return {
      type: "cta-button",
      version: 1,
      text: this.__text,
      url: this.__url,
      variant: this.__variant,
    };
  }

  decorate(editor: LexicalEditor): JSX.Element {
    return (
      <ButtonComponent
        text={this.__text}
        url={this.__url}
        variant={this.__variant}
        nodeKey={this.__key}
        editor={editor}
      />
    );
  }
}

export function $createButtonNode(
  text: string = "Zjistit vice",
  url: string = "#",
  variant: ButtonVariant = "primary",
): ButtonNode {
  return new ButtonNode(text, url, variant);
}

export function $isButtonNode(
  node: LexicalNode | null | undefined,
): node is ButtonNode {
  return node instanceof ButtonNode;
}
