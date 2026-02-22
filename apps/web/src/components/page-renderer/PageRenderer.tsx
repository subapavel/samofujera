"use client";

import type { ReactNode } from "react";

interface SerializedNode {
  type: string;
  children?: SerializedNode[];
  text?: string;
  format?: number;
  style?: string;
  tag?: string;
  listType?: string;
  url?: string;
  target?: string;
  indent?: number;
  // Custom node fields (legacy v2 compat)
  src?: string;
  altText?: string;
  alignment?: string;
  mediaItemId?: string;
  variant?: string;
  separatorStyle?: string;
}

// ── V3 block types ──

interface BlockBase {
  id: string;
  type: string;
}

interface TextBlockData extends BlockBase {
  type: "text";
  content: Record<string, unknown> | null;
}

interface ImageBlockData extends BlockBase {
  type: "image";
  src: string;
  altText: string;
  alignment: string;
  width?: number | null;
  height?: number | null;
  panX?: number;
  panY?: number;
}

interface SeparatorBlockData extends BlockBase {
  type: "separator";
  marginHeight?: string;
  separatorStyle?: string; // legacy v3 compat
}

interface ButtonBlockData extends BlockBase {
  type: "button";
  text: string;
  url: string;
  variant: string;
  alignment?: string;
  openInNewTab?: boolean;
}

type BlockData = TextBlockData | ImageBlockData | SeparatorBlockData | ButtonBlockData;

interface SectionData {
  id: string;
  blocks?: BlockData[];
  // v2 compat
  slots?: { id: string; content: Record<string, unknown> | null }[];
  // v1 compat
  content?: Record<string, unknown> | null;
}

// Lexical element format: ""=left(default), "left", "center", "right", "justify"
function getAlignmentClass(format: string | number | undefined): string {
  if (!format) return "";
  if (format === "center" || format === 2) return "text-center";
  if (format === "right" || format === 3) return "text-right";
  if (format === "justify" || format === 4) return "text-justify";
  return "";
}

interface PageRendererProps {
  content: Record<string, unknown>;
}

function renderLexicalContent(lexicalState: Record<string, unknown> | null | undefined) {
  if (!lexicalState) return null;
  const root = (lexicalState as Record<string, unknown>).root as { children: SerializedNode[] } | undefined;
  if (!root?.children) return null;
  return root.children.map((node, i) => renderNode(node, i));
}

// ── V3 block rendering ──

function renderBlock(block: BlockData): ReactNode {
  switch (block.type) {
    case "text": {
      const content = renderLexicalContent(block.content);
      // Empty text block → render as visible spacer
      if (!content) return <p><br /></p>;
      return content;
    }
    case "image":
      return <ImageBlockRenderer block={block} />;
    case "separator":
      return <SeparatorBlockRenderer block={block} />;
    case "button":
      return <ButtonBlockRenderer block={block} />;
    default:
      return null;
  }
}

function ImageBlockRenderer({ block }: { block: ImageBlockData }) {
  if (!block.src) return null;
  const hasCrop = block.width != null || block.height != null;

  if (hasCrop) {
    return (
      <div style={{ paddingTop: "20px", paddingBottom: "20px" }} className="text-center">
        <div
          style={{
            width: block.width ? `${block.width}px` : undefined,
            height: block.height ? `${block.height}px` : undefined,
            overflow: "hidden",
          }}
          className="mx-auto inline-block"
        >
          <img
            src={block.src}
            alt={block.altText ?? ""}
            style={{
              display: "block",
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: `${block.panX ?? 50}% ${block.panY ?? 50}%`,
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div style={{ paddingTop: "20px", paddingBottom: "20px" }} className="text-center">
      <img
        src={block.src}
        alt={block.altText ?? ""}
        className="max-w-full mx-auto"
        style={{ display: "block" }}
      />
    </div>
  );
}

function SeparatorBlockRenderer({ block }: { block: SeparatorBlockData }) {
  // Legacy ornamental style support
  if (block.separatorStyle === "ornamental") {
    return (
      <div className="my-8 flex items-center justify-center gap-3">
        <div className="h-px flex-1 bg-[rgb(6,93,77)]/30" />
        <span className="text-[rgb(6,93,77)]">&#10043;</span>
        <div className="h-px flex-1 bg-[rgb(6,93,77)]/30" />
      </div>
    );
  }
  const className = block.marginHeight === "minimal" ? "separator-block separator-min" : "separator-block separator-auto";
  return (
    <div className={className}>
      <hr />
    </div>
  );
}

const BUTTON_VARIANT_CLASSES: Record<string, string> = {
  style1: "btn-style1",
  style2: "btn-style2",
  style3: "btn-style3",
  style4: "btn-style4",
  style5: "btn-style5",
  // Legacy fallbacks
  primary: "bg-[rgb(6,93,77)] text-white hover:bg-[rgb(5,78,64)] px-8 py-3 rounded-lg font-semibold text-lg inline-block",
  secondary: "border-2 border-[rgb(6,93,77)] text-[rgb(6,93,77)] hover:bg-[rgb(6,93,77)] hover:text-white px-8 py-3 rounded-lg font-semibold text-lg inline-block",
};

function ButtonBlockRenderer({ block }: { block: ButtonBlockData }) {
  const variant = block.variant ?? "style1";
  const classes = BUTTON_VARIANT_CLASSES[variant] ?? BUTTON_VARIANT_CLASSES.style1;
  const alignment = block.alignment ?? "center";
  const alignClass = alignment === "left" ? "text-left" : alignment === "right" ? "text-right" : "text-center";
  const isLink = variant === "style3";
  const target = block.openInNewTab ? "_blank" : undefined;
  const rel = block.openInNewTab ? "noopener noreferrer" : undefined;
  return (
    <div className={`btn-block ${alignClass}`}>
      <a href={block.url ?? "#"} className={classes} target={target} rel={rel}>
        {block.text ?? "Zjistit více"}{isLink ? " →" : ""}
      </a>
    </div>
  );
}

export function PageRenderer({ content }: PageRendererProps) {
  const c = content as Record<string, unknown>;

  // Version 3: block-based section format
  if (c?.version === 3 && Array.isArray(c?.sections)) {
    const sections = c.sections as SectionData[];
    return (
      <div className="page-content">
        {sections.map((section) => (
          <section key={section.id} className="section-container">
            <div className="content-block">
              {section.blocks?.map((block) => {
                switch (block.type) {
                  case "text": {
                    const content = renderLexicalContent((block as TextBlockData).content);
                    if (!content) return <div key={block.id} className="text-block"><p><br /></p></div>;
                    return <div key={block.id} className="text-block">{content}</div>;
                  }
                  case "separator":
                    return <div key={block.id}>{renderBlock(block)}</div>;
                  case "image":
                    return <div key={block.id} className="image-block">{renderBlock(block)}</div>;
                  case "button":
                    return <div key={block.id}>{renderBlock(block)}</div>;
                  default:
                    return null;
                }
              })}
            </div>
          </section>
        ))}
      </div>
    );
  }

  // Version 2: slot-based section format
  if (c?.version === 2 && Array.isArray(c?.sections)) {
    const sections = c.sections as SectionData[];
    return (
      <div className="page-content">
        {sections.map((section) => (
          <div key={section.id}>
            {section.slots?.map((slot) => (
              <div key={slot.id}>
                {renderLexicalContent(slot.content)}
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  // Version 1: old section format (content directly on section)
  if (c?.version === 1 && Array.isArray(c?.sections)) {
    const sections = c.sections as SectionData[];
    return (
      <div className="page-content">
        {sections.map((section) => (
          <div key={section.id}>
            {renderLexicalContent(section.content)}
          </div>
        ))}
      </div>
    );
  }

  // Legacy: single Lexical state
  return <div className="page-content">{renderLexicalContent(content)}</div>;
}

function renderNode(node: SerializedNode, key: number): ReactNode {
  switch (node.type) {
    case "paragraph":
      return <ParagraphRenderer key={key} node={node} />;
    case "heading":
      return <HeadingRenderer key={key} node={node} />;
    case "quote":
      return <QuoteRenderer key={key} node={node} />;
    case "list":
      return <ListRenderer key={key} node={node} />;
    case "listitem":
      return <ListItemRenderer key={key} node={node} />;
    case "link":
      return <LinkRenderer key={key} node={node} />;
    case "image":
      return <LegacyImageRenderer key={key} node={node} />;
    case "cta-button":
      return <LegacyButtonRenderer key={key} node={node} />;
    case "separator":
      return <LegacySeparatorRenderer key={key} node={node} />;
    case "text":
      return <TextRenderer key={key} node={node} />;
    case "linebreak":
      return <br key={key} />;
    default:
      return null;
  }
}

function renderChildren(node: SerializedNode): ReactNode {
  if (!node.children) return null;
  return <>{node.children.map((child, i) => renderNode(child, i))}</>;
}

function parseStyleString(style: string | undefined): React.CSSProperties | undefined {
  if (!style) return undefined;
  const result: Record<string, string> = {};
  for (const part of style.split(";")) {
    const colonIdx = part.indexOf(":");
    if (colonIdx === -1) continue;
    const key = part.slice(0, colonIdx).trim();
    const value = part.slice(colonIdx + 1).trim();
    if (!key || !value) continue;
    // Convert CSS property to camelCase
    const camelKey = key.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
    result[camelKey] = value;
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

function TextRenderer({ node }: { node: SerializedNode }) {
  let element: ReactNode = <>{node.text}</>;
  const format = node.format ?? 0;
  if (format & 1) element = <strong>{element}</strong>;
  if (format & 2) element = <em>{element}</em>;
  if (format & 8) element = <u>{element}</u>;
  const inlineStyle = parseStyleString(node.style);
  if (inlineStyle) {
    element = <span style={inlineStyle}>{element}</span>;
  }
  return element;
}

function getIndentStyle(indent: number | undefined): React.CSSProperties | undefined {
  if (!indent || indent <= 0) return undefined;
  return { paddingInlineStart: `${indent * 2}rem` };
}

function ParagraphRenderer({ node }: { node: SerializedNode }) {
  const align = getAlignmentClass(node.format);
  const indentStyle = getIndentStyle(node.indent);
  if (!node.children || node.children.length === 0) {
    return <p className={align || undefined} style={indentStyle}><br /></p>;
  }
  return <p className={align || undefined} style={indentStyle}>{renderChildren(node)}</p>;
}

function HeadingRenderer({ node }: { node: SerializedNode }) {
  const tag = node.tag;
  const align = getAlignmentClass(node.format);
  const indentStyle = getIndentStyle(node.indent);
  if (tag === "h1") return <h1 className={align || undefined} style={indentStyle}>{renderChildren(node)}</h1>;
  if (tag === "h2") return <h2 className={align || undefined} style={indentStyle}>{renderChildren(node)}</h2>;
  if (tag === "h3") return <h3 className={align || undefined} style={indentStyle}>{renderChildren(node)}</h3>;
  if (tag === "h4") return <h4 className={align || undefined} style={indentStyle}>{renderChildren(node)}</h4>;
  if (tag === "h5") return <h5 className={align || undefined} style={indentStyle}>{renderChildren(node)}</h5>;
  if (tag === "h6") return <h6 className={align || undefined} style={indentStyle}>{renderChildren(node)}</h6>;
  return <h2 className={align || undefined} style={indentStyle}>{renderChildren(node)}</h2>;
}

function QuoteRenderer({ node }: { node: SerializedNode }) {
  const align = getAlignmentClass(node.format);
  const indentStyle = getIndentStyle(node.indent);
  return (
    <blockquote className={`border-l-4 border-[#065d4d] pl-4 italic text-black ${align}`} style={indentStyle}>
      {renderChildren(node)}
    </blockquote>
  );
}

function ListRenderer({ node }: { node: SerializedNode }) {
  const isOrdered = node.listType === "number";
  const Tag = isOrdered ? "ol" : "ul";
  const className = isOrdered
    ? "list-decimal pl-6"
    : "list-disc pl-6";
  return <Tag className={className}>{renderChildren(node)}</Tag>;
}

function ListItemRenderer({ node }: { node: SerializedNode }) {
  return <li className="mb-1">{renderChildren(node)}</li>;
}

function LinkRenderer({ node }: { node: SerializedNode }) {
  const isExternal = node.target === "_blank" || (!node.target && node.url?.startsWith("http"));
  return (
    <a
      href={node.url ?? "#"}
      className="text-[rgb(6,93,77)] underline hover:no-underline"
      target={isExternal ? "_blank" : undefined}
      rel={isExternal ? "noopener noreferrer" : undefined}
    >
      {renderChildren(node)}
    </a>
  );
}

// Legacy renderers for v2 Lexical node types
function LegacyImageRenderer({ node }: { node: SerializedNode }) {
  if (!node.src) return null;
  return (
    <img
      src={node.src}
      alt={node.altText ?? ""}
      className="max-w-full mx-auto"
      style={{ display: "block" }}
    />
  );
}

function LegacyButtonRenderer({ node }: { node: SerializedNode }) {
  const variant = node.variant ?? "primary";
  const className =
    variant === "primary"
      ? "bg-[rgb(6,93,77)] text-white hover:bg-[rgb(5,78,64)] px-8 py-3 rounded-lg font-semibold text-lg inline-block"
      : "border-2 border-[rgb(6,93,77)] text-[rgb(6,93,77)] hover:bg-[rgb(6,93,77)] hover:text-white px-8 py-3 rounded-lg font-semibold text-lg inline-block";
  return (
    <div className="my-6 text-center">
      <a href={node.url ?? "#"} className={className}>
        {node.text ?? "Zjistit více"}
      </a>
    </div>
  );
}

function LegacySeparatorRenderer({ node }: { node: SerializedNode }) {
  if (node.separatorStyle === "ornamental") {
    return (
      <div className="my-8 flex items-center justify-center gap-3">
        <div className="h-px flex-1 bg-[rgb(6,93,77)]/30" />
        <span className="text-[rgb(6,93,77)]">&#10043;</span>
        <div className="h-px flex-1 bg-[rgb(6,93,77)]/30" />
      </div>
    );
  }
  return <hr className="my-8 border-t border-[var(--border)]" />;
}
