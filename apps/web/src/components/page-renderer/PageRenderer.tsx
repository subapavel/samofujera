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
  mediaItemId?: string;
  variant?: string;
  separatorStyle?: string;
}

// Block-level node types that cannot be inside <p> tags
const BLOCK_TYPES = new Set([
  "image", "cta-button", "separator",
]);

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
      return <ButtonRenderer key={key} node={node} />;
    case "separator":
      return <SeparatorRenderer key={key} node={node} />;
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
  if (!node.children || node.children.length === 0) {
    return <p className="public-body-110 mb-4" />;
  }

  // Split children into groups: inline runs go into <p>, block nodes render standalone
  const groups: { type: "inline" | "block"; nodes: SerializedNode[] }[] = [];
  for (const child of node.children) {
    if (BLOCK_TYPES.has(child.type)) {
      groups.push({ type: "block", nodes: [child] });
    } else {
      const last = groups[groups.length - 1];
      if (last && last.type === "inline") {
        last.nodes.push(child);
      } else {
        groups.push({ type: "inline", nodes: [child] });
      }
    }
  }

  // If no block nodes, render normally
  if (groups.length === 1 && groups[0].type === "inline") {
    return <p className="public-body-110 mb-4">{renderChildren(node)}</p>;
  }

  // Mixed content: render inline runs in <p>, block nodes standalone
  return (
    <>
      {groups.map((group, gi) => {
        if (group.type === "inline") {
          return (
            <p key={gi} className="public-body-110 mb-4">
              {group.nodes.map((n, ni) => renderNode(n, ni))}
            </p>
          );
        }
        return group.nodes.map((n, ni) => renderNode(n, gi * 100 + ni));
      })}
    </>
  );
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

  // Use media API to get a fresh URL if mediaItemId is available
  const imgSrc = node.mediaItemId
    ? `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"}/api/media/${node.mediaItemId}/file`
    : node.src;

  if (!imgSrc) return null;

  return (
    <div className="my-4">
      <img
        src={imgSrc}
        alt={node.altText ?? ""}
        className={`max-w-full rounded ${alignClasses[alignment] ?? "mx-auto"}`}
        style={{ display: "block" }}
      />
    </div>
  );
}

function ButtonRenderer({ node }: { node: SerializedNode }) {
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

