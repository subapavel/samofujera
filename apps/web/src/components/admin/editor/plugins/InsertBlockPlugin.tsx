"use client";

import { useState } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $insertNodes, $getSelection, $isRangeSelection, $createParagraphNode } from "lexical";
import { $createImageNode } from "../nodes/ImageNode";
import { $createCTAButtonNode } from "../nodes/CTAButtonNode";
import { $createSeparatorNode } from "../nodes/SeparatorNode";
import { $createColumnsNode } from "../nodes/ColumnsNode";
import { $createGalleryNode } from "../nodes/GalleryNode";
import { $createContactFormNode } from "../nodes/ContactFormNode";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@samofujera/ui";

interface BlockTypeOption {
  label: string;
  description: string;
  insert: () => void;
}

export function InsertBlockPlugin() {
  const [editor] = useLexicalComposerContext();

  const blockTypes: BlockTypeOption[] = [
    {
      label: "Obrazek",
      description: "Vlozit obrazek z knihovny medii",
      insert: () => {
        editor.update(() => {
          const node = $createImageNode();
          $insertNodes([node, $createParagraphNode()]);
        });
      },
    },
    {
      label: "CTA tlacitko",
      description: "Tlacitko s odkazem",
      insert: () => {
        editor.update(() => {
          const node = $createCTAButtonNode();
          $insertNodes([node, $createParagraphNode()]);
        });
      },
    },
    {
      label: "Oddelovac",
      description: "Dekoracni oddelovac sekci",
      insert: () => {
        editor.update(() => {
          const node = $createSeparatorNode();
          $insertNodes([node, $createParagraphNode()]);
        });
      },
    },
    {
      label: "Sloupce",
      description: "2 nebo 3 sloupce vedle sebe",
      insert: () => {
        editor.update(() => {
          const node = $createColumnsNode();
          $insertNodes([node, $createParagraphNode()]);
        });
      },
    },
    {
      label: "Galerie",
      description: "Mrizka obrazku",
      insert: () => {
        editor.update(() => {
          const node = $createGalleryNode();
          $insertNodes([node, $createParagraphNode()]);
        });
      },
    },
    {
      label: "Kontaktni formular",
      description: "Formular pro odesilani zprav",
      insert: () => {
        editor.update(() => {
          const node = $createContactFormNode();
          $insertNodes([node, $createParagraphNode()]);
        });
      },
    },
  ];

  return (
    <div className="my-2 flex justify-center">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex h-8 w-8 items-center justify-center rounded-full border border-dashed border-[var(--border)] text-[var(--muted-foreground)] transition-colors hover:border-[rgb(6,93,77)] hover:text-[rgb(6,93,77)]">
            +
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {blockTypes.map((bt) => (
            <DropdownMenuItem key={bt.label} onClick={bt.insert}>
              <div>
                <p className="font-medium">{bt.label}</p>
                <p className="text-xs text-[var(--muted-foreground)]">{bt.description}</p>
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
