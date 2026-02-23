"use client";

import { type JSX, useState, useRef } from "react";
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
import { useQuery } from "@tanstack/react-query";
import { imageApi } from "@samofujera/api-client";
import type { ImageDetailResponse } from "@samofujera/api-client";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
} from "@samofujera/ui";
import { ImageGrid } from "../../images/ImageGrid";
import { UploadProgress } from "../../images/UploadProgress";
import { useMultiUpload } from "../../images/useMultiUpload";
import { BlockWrapper } from "./BlockWrapper";

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
  const [showPicker, setShowPicker] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState<ImageDetailResponse | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const multiUpload = useMultiUpload({ isPublic: true });

  const itemsQuery = useQuery({
    queryKey: ["images", "picker", { search, pickerOpen: showPicker }],
    queryFn: () =>
      imageApi.getImages({
        search: search || undefined,
        limit: 50,
      }),
    enabled: showPicker,
  });

  const alignClasses: Record<ImageAlignment, string> = {
    left: "mr-auto",
    center: "mx-auto",
    right: "ml-auto",
    full: "w-full",
  };

  // Filter to show only images from the results
  const imageItems = (itemsQuery.data?.data?.items ?? []).filter((item) =>
    item.mimeType.startsWith("image/"),
  );

  function handleAlignmentChange(newAlignment: ImageAlignment) {
    editor.update(() => {
      const node = $getNodeByKey(nodeKey);
      if ($isImageNode(node)) {
        node.setAlignment(newAlignment);
      }
    });
  }

  function handlePickerOpen() {
    setShowPicker(true);
    setSelectedItem(null);
    setSearch("");
  }

  function handleUpload() {
    const files = fileInputRef.current?.files;
    if (files && files.length > 0) {
      multiUpload.addFiles(files);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleConfirmSelect() {
    if (selectedItem) {
      const imageUrl = selectedItem.url;
      const alt = selectedItem.altText ?? selectedItem.originalFilename;
      editor.update(() => {
        const node = $getNodeByKey(nodeKey);
        if ($isImageNode(node)) {
          node.setSrc(imageUrl);
          node.setAltText(alt);
          node.setMediaItemId(selectedItem.id);
        }
      });
      setShowPicker(false);
      setSelectedItem(null);
    }
  }

  return (
    <>
      <BlockWrapper
        nodeKey={nodeKey}
        editor={editor}
        isSelected={isSelected}
        onSelect={() => setIsSelected(!isSelected)}
        className="relative my-4"
      >
        {src ? (
          <>
            <img
              src={src}
              alt={altText}
              className={`max-w-full rounded ${alignClasses[alignment]}`}
              style={{ display: "block" }}
            />
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
                <button
                  className="rounded px-2 py-1 text-xs hover:bg-[var(--accent)]"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePickerOpen();
                  }}
                >
                  Změnit
                </button>
              </div>
            )}
          </>
        ) : (
          <div
            className={`flex h-48 cursor-pointer items-center justify-center rounded border-2 border-dashed border-[var(--border)] bg-[var(--muted)] hover:border-[rgb(6,93,77)] hover:bg-[rgb(6,93,77)]/5 ${alignClasses[alignment]}`}
            onClick={(e) => {
              e.stopPropagation();
              handlePickerOpen();
            }}
          >
            <span className="text-[var(--muted-foreground)]">Klikni pro vložení obrázku</span>
          </div>
        )}
      </BlockWrapper>

      <Dialog open={showPicker} onOpenChange={setShowPicker}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Vybrat obrázek</DialogTitle>
          </DialogHeader>

          <div>
            <Input
              placeholder="Hledat podle názvu..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="min-h-[300px] max-h-[50vh] overflow-y-auto">
            {itemsQuery.isLoading && (
              <p className="py-8 text-center text-sm text-[var(--muted-foreground)]">
                Načítání...
              </p>
            )}
            {itemsQuery.isSuccess && (
              <ImageGrid
                items={imageItems}
                selectedId={selectedItem?.id}
                onSelect={setSelectedItem}
              />
            )}
          </div>

          {multiUpload.uploads.length > 0 && (
            <div className="border-t border-[var(--border)] pt-3">
              <UploadProgress
                uploads={multiUpload.uploads}
                onCancel={multiUpload.cancelUpload}
                onClearDone={multiUpload.clearDone}
              />
            </div>
          )}

          <div className="flex items-center justify-between border-t border-[var(--border)] pt-4">
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleUpload}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={multiUpload.isUploading}
              >
                {multiUpload.isUploading ? "Nahrávám..." : "Nahrát obrázky"}
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowPicker(false)}
              >
                Zrušit
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleConfirmSelect}
                disabled={!selectedItem}
              >
                Vybrat
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

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
