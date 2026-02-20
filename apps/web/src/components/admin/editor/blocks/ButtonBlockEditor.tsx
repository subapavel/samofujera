"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Trash2, MoreVertical, Copy, AlignLeft, AlignCenter, AlignRight, Link2 } from "lucide-react";
import type { ButtonBlock, ButtonVariant, ButtonAlignment } from "../types";
import { LinkEditorPanel } from "../shared/LinkEditorPanel";

interface ButtonBlockEditorProps {
  block: ButtonBlock;
  onChange: (block: ButtonBlock) => void;
  onDelete: () => void;
  onCopy: () => void;
  onActiveChange?: (active: boolean) => void;
}

// ── Button style definitions ──

const BUTTON_STYLES: { value: ButtonVariant; label: string; classes: string; isLink?: boolean }[] = [
  { value: "style1", label: "Styl 1", classes: "btn-style1" },
  { value: "style2", label: "Styl 2", classes: "btn-style2" },
  { value: "style3", label: "Styl 3", classes: "btn-style3", isLink: true },
  { value: "style4", label: "Styl 4", classes: "btn-style4" },
  { value: "style5", label: "Styl 5", classes: "btn-style5" },
];


function getStyleClasses(variant: ButtonVariant): string {
  return BUTTON_STYLES.find((s) => s.value === variant)?.classes ?? BUTTON_STYLES[0].classes;
}

function isLinkStyle(variant: ButtonVariant): boolean {
  return BUTTON_STYLES.find((s) => s.value === variant)?.isLink ?? false;
}

const ALIGNMENT_OPTIONS: { value: ButtonAlignment; label: string; icon: typeof AlignLeft }[] = [
  { value: "left", label: "Vlevo", icon: AlignLeft },
  { value: "center", label: "Na střed", icon: AlignCenter },
  { value: "right", label: "Vpravo", icon: AlignRight },
];

function getAlignmentClass(alignment: ButtonAlignment): string {
  if (alignment === "left") return "text-left";
  if (alignment === "right") return "text-right";
  return "text-center";
}

// ── Insert dialog (dark themed, uses shared LinkEditorPanel) ──

function InsertDialog({ onConfirm, onCancel }: {
  onConfirm: (url: string, openInNewTab: boolean) => void;
  onCancel: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dialogRef.current && !dialogRef.current.contains(e.target as Node)) {
        onCancel();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onCancel]);

  return (
    <div className="flex justify-center py-4">
      <div ref={dialogRef} className="w-full max-w-md rounded-xl border border-gray-700 bg-gray-800 p-6 shadow-2xl">
        {/* Header */}
        <div className="mb-5 flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border-2 border-white/40 text-white/60">
            <Link2 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-lg font-bold text-white">Vložit tlačítko</p>
            <p className="mt-1 text-sm text-white/60">Zadejte odkaz pro nové tlačítko.</p>
          </div>
        </div>

        <LinkEditorPanel

          confirmLabel="Vložit"
          cancelLabel="Zavřít"
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      </div>
    </div>
  );
}

// ── Link edit popover (dark, used from toolbar) ──

function LinkEditPopover({ url, openInNewTab, onSave, onClose }: {
  url: string;
  openInNewTab: boolean;
  onSave: (url: string, openInNewTab: boolean) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  return (
    <div ref={ref} className="absolute left-0 top-full mt-1 z-50 w-80 rounded-lg border border-gray-600 bg-gray-800 p-3 shadow-lg">
      <LinkEditorPanel
        initialUrl={url}
        initialOpenInNewTab={openInNewTab}
        confirmLabel="OK"
        cancelLabel="Zrušit"
        onConfirm={onSave}
        onCancel={onClose}
      />
    </div>
  );
}

// ── Main editor ──

export function ButtonBlockEditor({ block, onChange, onDelete, onCopy, onActiveChange }: ButtonBlockEditorProps) {
  const [showToolbar, setShowToolbar] = useState(false);
  const [showStyleDropdown, setShowStyleDropdown] = useState(false);
  const [showAlignDropdown, setShowAlignDropdown] = useState(false);
  const [showLinkEdit, setShowLinkEdit] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [isEditingText, setIsEditingText] = useState(false);
  const [editText, setEditText] = useState(block.text);
  const textInputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const isNew = block.url === "" && block.text === "";

  // Close toolbar on outside click
  useEffect(() => {
    if (!showToolbar) return;
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowToolbar(false);
        setShowStyleDropdown(false);
        setShowAlignDropdown(false);
        setShowLinkEdit(false);
        setShowMoreMenu(false);
        onActiveChange?.(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showToolbar, onActiveChange]);

  // New block → show insert dialog
  if (isNew) {
    return (
      <InsertDialog
        onConfirm={(url, openInNewTab) => {
          onChange({ ...block, text: "Zjistit více", url, variant: "style4", openInNewTab });
        }}
        onCancel={() => {
          onDelete();
        }}
      />
    );
  }

  const alignment = block.alignment ?? "center";

  function closeAllDropdowns() {
    setShowStyleDropdown(false);
    setShowAlignDropdown(false);
    setShowLinkEdit(false);
    setShowMoreMenu(false);
  }

  return (
    <div
      ref={wrapperRef}
      className="relative cursor-pointer py-4"
      onClick={() => {
        const next = !showToolbar;
        setShowToolbar(next);
        if (!next) closeAllDropdowns();
        onActiveChange?.(next);
      }}
    >
      {/* Button preview */}
      <div className={getAlignmentClass(alignment)}>
        {isEditingText ? (
          <span className={getStyleClasses(block.variant)} style={{ position: "relative" }}>
            <input
              ref={textInputRef}
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  const trimmed = editText.trim();
                  if (trimmed) onChange({ ...block, text: trimmed });
                  setIsEditingText(false);
                } else if (e.key === "Escape") {
                  setEditText(block.text);
                  setIsEditingText(false);
                }
              }}
              onBlur={() => {
                const trimmed = editText.trim();
                if (trimmed) onChange({ ...block, text: trimmed });
                setIsEditingText(false);
              }}
              onClick={(e) => e.stopPropagation()}
              className="bg-transparent text-inherit font-inherit text-center outline-none border-none w-full"
              style={{ font: "inherit", letterSpacing: "inherit", textTransform: "inherit" }}
            />
          </span>
        ) : (
          <span
            className={getStyleClasses(block.variant)}
            onDoubleClick={(e) => {
              e.stopPropagation();
              setEditText(block.text);
              setIsEditingText(true);
              setTimeout(() => textInputRef.current?.select(), 0);
            }}
          >
            {block.text}{isLinkStyle(block.variant) ? " →" : ""}
          </span>
        )}
      </div>

      {/* Floating toolbar */}
      {showToolbar && (
        <div
          className="absolute left-1/2 -translate-x-1/2 z-50 flex items-center rounded-lg bg-gray-800 px-1 py-1.5 shadow-lg"
          style={{ bottom: "calc(100% + 8px)" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Go to link */}
          <button
            type="button"
            className="flex items-center gap-1 rounded px-2.5 py-1 text-xs text-white/90 transition-colors hover:bg-white/10 whitespace-nowrap"
            onClick={() => {
              if (!block.url) return;
              const href = block.url.startsWith("http") || block.url.startsWith("/")
                ? block.url
                : `https://${block.url}`;
              window.open(href, "_blank");
            }}
          >
            Přejít na odkaz
          </button>

          <div className="mx-0.5 h-4 w-px bg-white/20" />

          {/* Change link */}
          <div className="relative">
            <button
              type="button"
              className="flex items-center gap-1 rounded px-2.5 py-1 text-xs text-white/90 transition-colors hover:bg-white/10 whitespace-nowrap"
              onClick={() => {
                setShowLinkEdit(!showLinkEdit);
                setShowStyleDropdown(false);
                setShowAlignDropdown(false);
                setShowMoreMenu(false);
              }}
            >
              Změnit odkaz
            </button>
            {showLinkEdit && (
              <LinkEditPopover
                url={block.url}
                openInNewTab={block.openInNewTab ?? false}
                onSave={(url, openInNewTab) => {
                  onChange({ ...block, url, openInNewTab });
                  setShowLinkEdit(false);
                }}
                onClose={() => setShowLinkEdit(false)}
              />
            )}
          </div>

          <div className="mx-0.5 h-4 w-px bg-white/20" />

          {/* Style dropdown */}
          <div className="relative">
            <button
              type="button"
              className="flex items-center gap-1 rounded px-2.5 py-1 text-xs text-white/90 transition-colors hover:bg-white/10 whitespace-nowrap"
              onClick={() => {
                setShowStyleDropdown(!showStyleDropdown);
                setShowAlignDropdown(false);
                setShowLinkEdit(false);
                setShowMoreMenu(false);
              }}
            >
              Vzhled
              <ChevronDown className="h-3 w-3" />
            </button>
            {showStyleDropdown && (
              <div className="absolute left-0 top-full mt-1 z-50 w-32 rounded-lg border border-gray-600 bg-gray-800 py-1 shadow-lg">
                {BUTTON_STYLES.map((style) => (
                  <button
                    key={style.value}
                    type="button"
                    className={`flex w-full items-center px-3 py-1.5 text-xs transition-colors hover:bg-white/10 ${
                      block.variant === style.value ? "text-white font-medium" : "text-white/70"
                    }`}
                    onClick={() => {
                      onChange({ ...block, variant: style.value });
                      setShowStyleDropdown(false);
                    }}
                  >
                    {block.variant === style.value && <span className="mr-2">✓</span>}
                    {style.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="mx-0.5 h-4 w-px bg-white/20" />

          {/* Alignment dropdown */}
          <div className="relative">
            <button
              type="button"
              className="flex items-center gap-1 rounded px-2.5 py-1 text-xs text-white/90 transition-colors hover:bg-white/10 whitespace-nowrap"
              onClick={() => {
                setShowAlignDropdown(!showAlignDropdown);
                setShowStyleDropdown(false);
                setShowLinkEdit(false);
                setShowMoreMenu(false);
              }}
            >
              Zarovnat
              <ChevronDown className="h-3 w-3" />
            </button>
            {showAlignDropdown && (
              <div className="absolute left-0 top-full mt-1 z-50 w-36 rounded-lg border border-gray-600 bg-gray-800 py-1 shadow-lg">
                {ALIGNMENT_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      className={`flex w-full items-center gap-2 px-3 py-1.5 text-xs transition-colors hover:bg-white/10 ${
                        alignment === opt.value ? "text-white font-medium" : "text-white/70"
                      }`}
                      onClick={() => {
                        onChange({ ...block, alignment: opt.value });
                        setShowAlignDropdown(false);
                      }}
                    >
                      {alignment === opt.value && <span className="mr-1">✓</span>}
                      <Icon className="h-3 w-3" />
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mx-0.5 h-4 w-px bg-white/20" />

          {/* Delete */}
          <button
            type="button"
            className="flex items-center rounded px-2 py-1 text-white/90 transition-colors hover:bg-white/10"
            onClick={() => {
              setShowToolbar(false);
              closeAllDropdowns();
              onActiveChange?.(false);
              onDelete();
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>

          {/* More menu (copy) */}
          <div className="relative">
            <button
              type="button"
              className="flex items-center rounded px-1.5 py-1 text-white/90 transition-colors hover:bg-white/10"
              onClick={() => {
                setShowMoreMenu(!showMoreMenu);
                setShowStyleDropdown(false);
                setShowAlignDropdown(false);
                setShowLinkEdit(false);
              }}
            >
              <MoreVertical className="h-3.5 w-3.5" />
            </button>
            {showMoreMenu && (
              <div className="absolute right-0 top-full mt-1 z-50 w-36 rounded-lg border border-gray-600 bg-gray-800 py-1 shadow-lg">
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-white/70 transition-colors hover:bg-white/10"
                  onClick={() => {
                    setShowToolbar(false);
                    closeAllDropdowns();
                    onActiveChange?.(false);
                    onCopy();
                  }}
                >
                  <Copy className="h-3 w-3" />
                  Zkopírovat
                </button>
              </div>
            )}
          </div>

          {/* Arrow pointer */}
          <div className="absolute left-1/2 -bottom-1.5 -translate-x-1/2 h-0 w-0 border-x-[6px] border-t-[6px] border-x-transparent border-t-gray-800" />
        </div>
      )}
    </div>
  );
}
