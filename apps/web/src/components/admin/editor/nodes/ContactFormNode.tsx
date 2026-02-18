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

export type SerializedContactFormNode = Spread<
  {
    formTitle: string;
  },
  SerializedLexicalNode
>;

function ContactFormComponent({
  formTitle,
  nodeKey,
  editor,
}: {
  formTitle: string;
  nodeKey: NodeKey;
  editor: LexicalEditor;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(formTitle);

  function handleSave() {
    editor.update(() => {
      const node = $getNodeByKey(nodeKey);
      if ($isContactFormNode(node)) {
        node.setFormTitle(editTitle);
      }
    });
    setIsEditing(false);
  }

  return (
    <div className="my-8 rounded-lg border border-[var(--border)] bg-white/80 p-6">
      {isEditing ? (
        <div className="mb-4 flex items-center gap-2">
          <input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="flex-1 rounded border border-[var(--border)] px-3 py-1.5 text-lg font-semibold"
            autoFocus
          />
          <button
            className="rounded bg-[rgb(6,93,77)] px-3 py-1 text-sm text-white"
            onClick={handleSave}
          >
            OK
          </button>
        </div>
      ) : (
        <h3
          className="public-h3 mb-4 cursor-pointer pb-2"
          onClick={() => setIsEditing(true)}
        >
          {formTitle || "Kontaktni formular"}
        </h3>
      )}
      {/* Non-interactive preview of the form */}
      <div className="space-y-3 opacity-70">
        <div>
          <label className="mb-1 block text-sm font-medium">Jmeno</label>
          <div className="h-10 rounded-md border border-[var(--border)] bg-[var(--muted)]" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Email</label>
          <div className="h-10 rounded-md border border-[var(--border)] bg-[var(--muted)]" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Zprava</label>
          <div className="h-24 rounded-md border border-[var(--border)] bg-[var(--muted)]" />
        </div>
        <div className="rounded bg-[rgb(6,93,77)] px-6 py-2 text-center text-white opacity-60">
          Odeslat
        </div>
      </div>
      <p className="mt-2 text-center text-xs text-[var(--muted-foreground)]">
        Nahled kontaktniho formulare — funkcni na verejne strance
      </p>
    </div>
  );
}

export class ContactFormNode extends DecoratorNode<JSX.Element> {
  __formTitle: string;

  static getType(): string {
    return "contact-form";
  }

  static clone(node: ContactFormNode): ContactFormNode {
    return new ContactFormNode(node.__formTitle, node.__key);
  }

  constructor(formTitle: string = "Napiste mi", key?: NodeKey) {
    super(key);
    this.__formTitle = formTitle;
  }

  createDOM(_config: EditorConfig): HTMLElement {
    return document.createElement("div");
  }

  updateDOM(): boolean {
    return false;
  }

  setFormTitle(title: string): void {
    const writable = this.getWritable();
    writable.__formTitle = title;
  }

  static importJSON(serializedNode: SerializedContactFormNode): ContactFormNode {
    return $createContactFormNode(serializedNode.formTitle);
  }

  exportJSON(): SerializedContactFormNode {
    return {
      type: "contact-form",
      version: 1,
      formTitle: this.__formTitle,
    };
  }

  decorate(editor: LexicalEditor): JSX.Element {
    return (
      <ContactFormComponent
        formTitle={this.__formTitle}
        nodeKey={this.__key}
        editor={editor}
      />
    );
  }
}

export function $createContactFormNode(
  formTitle: string = "Napiste mi",
): ContactFormNode {
  return new ContactFormNode(formTitle);
}

export function $isContactFormNode(
  node: LexicalNode | null | undefined,
): node is ContactFormNode {
  return node instanceof ContactFormNode;
}
