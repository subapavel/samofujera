import type { SerializedEditorState } from "lexical";

// ── Block types ──

export type ImageAlignment = "left" | "center" | "right" | "full";
export type SeparatorMargin = "standard" | "minimal";
export type ButtonVariant = "style1" | "style2" | "style3" | "style4" | "style5";
export type ButtonAlignment = "left" | "center" | "right";
export type ProductsAppearance = "default" | "large-photo" | "slider" | "carousel";
export type ProductsColumns = 3 | 4 | 5;

interface BlockBase {
  id: string;
  type: string;
}

export interface TextBlock extends BlockBase {
  type: "text";
  content: SerializedEditorState | null;
}

export interface ImageBlock extends BlockBase {
  type: "image";
  src: string;
  altText: string;
  alignment: ImageAlignment;
  mediaItemId: string | null;
  width: number | null;
  height: number | null;
  panX: number;
  panY: number;
}

export interface SeparatorBlock extends BlockBase {
  type: "separator";
  marginHeight: SeparatorMargin;
}

export interface ButtonBlock extends BlockBase {
  type: "button";
  text: string;
  url: string;
  variant: ButtonVariant;
  alignment: ButtonAlignment;
  openInNewTab: boolean;
}

export interface ProductsBlock extends BlockBase {
  type: "products";
  mode: "category" | "manual";
  categoryId: string | null;
  productIds: string[];
  appearance: ProductsAppearance;
  columns: ProductsColumns;
  showCategoryFilter: boolean;
}

export interface ProductBlock extends BlockBase {
  type: "product";
  productId: string;
}

export type ContentBlock = TextBlock | ImageBlock | SeparatorBlock | ButtonBlock | ProductsBlock | ProductBlock;
export type BlockType = ContentBlock["type"];

// ── Section / Page ──

export interface PageSection {
  id: string;
  blocks: ContentBlock[];
}

export interface SectionPageContent {
  version: 3;
  sections: PageSection[];
}

// ── Factories ──

export function createTextBlock(content?: SerializedEditorState | null): TextBlock {
  return { id: crypto.randomUUID(), type: "text", content: content ?? null };
}

export function createImageBlock(): ImageBlock {
  return {
    id: crypto.randomUUID(),
    type: "image",
    src: "",
    altText: "",
    alignment: "center",
    mediaItemId: null,
    width: null,
    height: null,
    panX: 50,
    panY: 50,
  };
}

export function createSeparatorBlock(): SeparatorBlock {
  return { id: crypto.randomUUID(), type: "separator", marginHeight: "standard" };
}

export function createButtonBlock(): ButtonBlock {
  return {
    id: crypto.randomUUID(),
    type: "button",
    text: "",
    url: "",
    variant: "style1",
    alignment: "center",
    openInNewTab: false,
  };
}

export function createProductBlock(productId: string): ProductBlock {
  return { id: crypto.randomUUID(), type: "product", productId };
}

export function createProductsBlock(): ProductsBlock {
  return {
    id: crypto.randomUUID(),
    type: "products",
    mode: "category",
    categoryId: null,
    productIds: [],
    appearance: "default",
    columns: 4,
    showCategoryFilter: true,
  };
}

const DEFAULT_TEXT_CONTENT = {
  root: {
    children: [
      {
        type: "heading",
        tag: "h1",
        children: [
          { type: "text", text: "Nadpis textu", format: 1, mode: "normal", style: "", detail: 0, version: 1 },
        ],
        direction: "ltr",
        format: "center",
        indent: 0,
        version: 1,
      },
      {
        type: "paragraph",
        children: [
          { type: "text", text: "Váš text začíná právě zde. Klikněte a můžete začít psát. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium totam rem aperiam eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo nemo enim ipsam voluptatem.", format: 0, mode: "normal", style: "", detail: 0, version: 1 },
        ],
        direction: "ltr",
        format: "",
        indent: 0,
        version: 1,
      },
    ],
    direction: "ltr",
    format: "",
    indent: 0,
    type: "root",
    version: 1,
  },
} as unknown as SerializedEditorState;

/** Create a default section with one text block (H1 + lorem ipsum) */
export function createDefaultSection(): PageSection {
  return {
    id: crypto.randomUUID(),
    blocks: [createTextBlock(DEFAULT_TEXT_CONTENT)],
  };
}

/** Create an empty section with one empty text block */
export function createEmptySection(): PageSection {
  return {
    id: crypto.randomUUID(),
    blocks: [createTextBlock()],
  };
}

/** Create a product page section with a product block + empty text block */
export function createProductSection(productId: string): PageSection {
  return {
    id: crypto.randomUUID(),
    blocks: [createProductBlock(productId), createTextBlock()],
  };
}
