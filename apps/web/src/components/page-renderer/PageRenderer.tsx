"use client";

import type { ReactNode } from "react";

interface SerializedNode {
  type: string;
  children?: SerializedNode[];
  text?: string;
  format?: number;
  tag?: string;
  listType?: string;
  url?: string;
  // Custom node fields
  src?: string;
  altText?: string;
  alignment?: string;
  variant?: string;
  separatorStyle?: string;
  columnCount?: number;
  columnContents?: string[];
  images?: Array<{ src: string; altText: string }>;
  columns?: number;
  formTitle?: string;
}

interface PageRendererProps {
  content: Record<string, unknown>;
}

export function PageRenderer({ content }: PageRendererProps) {
  const root = content?.root as { children: SerializedNode[] } | undefined;
  if (!root?.children) return null;
  return <>{root.children.map((node, i) => renderNode(node, i))}</>;
}

function renderNode(node: SerializedNode, key: number): ReactNode {
  switch (node.type) {
    case "paragraph":
      return <ParagraphRenderer key={key} node={node} />;
    case "heading":
      return <HeadingRenderer key={key} node={node} />;
    case "list":
      return <ListRenderer key={key} node={node} />;
    case "listitem":
      return <ListItemRenderer key={key} node={node} />;
    case "link":
      return <LinkRenderer key={key} node={node} />;
    case "image":
      return <ImageRenderer key={key} node={node} />;
    case "cta-button":
      return <CTARenderer key={key} node={node} />;
    case "separator":
      return <SeparatorRenderer key={key} node={node} />;
    case "columns":
      return <ColumnsRenderer key={key} node={node} />;
    case "gallery":
      return <GalleryRenderer key={key} node={node} />;
    case "contact-form":
      return <ContactFormRenderer key={key} node={node} />;
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

function TextRenderer({ node }: { node: SerializedNode }) {
  let element: ReactNode = <>{node.text}</>;
  const format = node.format ?? 0;
  // Lexical format flags: 1=bold, 2=italic, 4=strikethrough, 8=underline
  if (format & 1) element = <strong>{element}</strong>;
  if (format & 2) element = <em>{element}</em>;
  if (format & 8) element = <u>{element}</u>;
  return element;
}

function ParagraphRenderer({ node }: { node: SerializedNode }) {
  return <p className="public-body-110 mb-4">{renderChildren(node)}</p>;
}

function HeadingRenderer({ node }: { node: SerializedNode }) {
  const tag = node.tag;
  if (tag === "h2") {
    return <h2 className="public-h2-sm pb-3.5">{renderChildren(node)}</h2>;
  }
  if (tag === "h3") {
    return <h3 className="public-h3 pb-2">{renderChildren(node)}</h3>;
  }
  return <h2 className="public-h2-sm pb-3.5">{renderChildren(node)}</h2>;
}

function ListRenderer({ node }: { node: SerializedNode }) {
  const isOrdered = node.listType === "number";
  const Tag = isOrdered ? "ol" : "ul";
  const className = isOrdered
    ? "list-decimal pl-6 mb-4 public-body-110"
    : "list-disc pl-6 mb-4 public-body-110";
  return <Tag className={className}>{renderChildren(node)}</Tag>;
}

function ListItemRenderer({ node }: { node: SerializedNode }) {
  return <li className="mb-1">{renderChildren(node)}</li>;
}

function LinkRenderer({ node }: { node: SerializedNode }) {
  return (
    <a
      href={node.url ?? "#"}
      className="text-[rgb(6,93,77)] underline hover:no-underline"
      target={node.url?.startsWith("http") ? "_blank" : undefined}
      rel={node.url?.startsWith("http") ? "noopener noreferrer" : undefined}
    >
      {renderChildren(node)}
    </a>
  );
}

function ImageRenderer({ node }: { node: SerializedNode }) {
  const alignClasses: Record<string, string> = {
    left: "mr-auto",
    center: "mx-auto",
    right: "ml-auto",
    full: "w-full",
  };
  const alignment = node.alignment ?? "center";
  return (
    <div className="my-4">
      <img
        src={node.src}
        alt={node.altText ?? ""}
        className={`max-w-full rounded ${alignClasses[alignment] ?? "mx-auto"}`}
        style={{ display: "block" }}
      />
    </div>
  );
}

function CTARenderer({ node }: { node: SerializedNode }) {
  const variant = node.variant ?? "primary";
  const className =
    variant === "primary"
      ? "bg-[rgb(6,93,77)] text-white hover:bg-[rgb(5,78,64)] px-8 py-3 rounded-lg font-semibold text-lg inline-block"
      : "border-2 border-[rgb(6,93,77)] text-[rgb(6,93,77)] hover:bg-[rgb(6,93,77)] hover:text-white px-8 py-3 rounded-lg font-semibold text-lg inline-block";
  return (
    <div className="my-6 text-center">
      <a href={node.url ?? "#"} className={className}>
        {node.text ?? "Zjistit vice"}
      </a>
    </div>
  );
}

function SeparatorRenderer({ node }: { node: SerializedNode }) {
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

function ColumnsRenderer({ node }: { node: SerializedNode }) {
  const count = node.columnCount ?? 2;
  const contents = node.columnContents ?? [];
  const gridClass = count === 2 ? "grid-cols-2" : "grid-cols-3";
  return (
    <div className={`my-6 grid ${gridClass} gap-4`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="public-body-110">
          {contents[i] ?? ""}
        </div>
      ))}
    </div>
  );
}

function GalleryRenderer({ node }: { node: SerializedNode }) {
  const images = node.images ?? [];
  const cols = node.columns ?? 3;
  const gridClass =
    cols === 2 ? "grid-cols-2" : cols === 3 ? "grid-cols-3" : "grid-cols-4";
  if (images.length === 0) return null;
  return (
    <div className={`my-6 grid ${gridClass} gap-2`}>
      {images.map((img, i) => (
        <div key={i} className="aspect-square overflow-hidden rounded">
          <img
            src={img.src}
            alt={img.altText ?? ""}
            className="h-full w-full object-cover"
          />
        </div>
      ))}
    </div>
  );
}

function ContactFormRenderer({ node }: { node: SerializedNode }) {
  return (
    <div className="my-8 rounded-lg border border-[var(--border)] bg-white/80 p-6">
      <h3 className="public-h3 mb-4 pb-2">{node.formTitle ?? "Napiste mi"}</h3>
      <form className="space-y-3" action="/api/contact" method="POST">
        <div>
          <label className="mb-1 block text-sm font-medium">Jmeno</label>
          <input
            type="text"
            name="name"
            required
            className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Email</label>
          <input
            type="email"
            name="email"
            required
            className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Zprava</label>
          <textarea
            name="message"
            required
            rows={4}
            className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          className="rounded bg-[rgb(6,93,77)] px-6 py-2 text-white hover:bg-[rgb(5,78,64)]"
        >
          Odeslat
        </button>
      </form>
    </div>
  );
}
