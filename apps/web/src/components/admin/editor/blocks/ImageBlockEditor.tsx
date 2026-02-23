"use client";

import { useState, useRef, useEffect, useCallback } from "react";
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
import {
  Pencil,
  ChevronDown,
  Trash2,
  MoreVertical,
  Copy,
  RotateCcw,
  Link,
  Unlink,
} from "lucide-react";
import { ImageGrid } from "../../images/ImageGrid";
import { UploadProgress } from "../../images/UploadProgress";
import { useMultiUpload } from "../../images/useMultiUpload";
import type { ImageBlock } from "../types";

interface ImageBlockEditorProps {
  block: ImageBlock;
  onChange: (block: ImageBlock) => void;
  onDelete: () => void;
  onCopy: () => void;
  onActiveChange?: (active: boolean) => void;
}

// ── Resize handle types ──

type HandleDir = "n" | "s" | "e" | "w" | "nw" | "ne" | "sw" | "se";

const HANDLE_DIRS: HandleDir[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

const HANDLE_CURSORS: Record<HandleDir, string> = {
  nw: "nw-resize",
  n: "n-resize",
  ne: "ne-resize",
  e: "e-resize",
  se: "se-resize",
  s: "s-resize",
  sw: "sw-resize",
  w: "w-resize",
};

// Position each handle: [top%, left%]
const HANDLE_POSITIONS: Record<HandleDir, { top: string; left: string }> = {
  nw: { top: "0%", left: "0%" },
  n:  { top: "0%", left: "50%" },
  ne: { top: "0%", left: "100%" },
  e:  { top: "50%", left: "100%" },
  se: { top: "100%", left: "100%" },
  s:  { top: "100%", left: "50%" },
  sw: { top: "100%", left: "0%" },
  w:  { top: "50%", left: "0%" },
};

// ── Size popover component ──

function SizePopover({
  width,
  height,
  naturalWidth,
  naturalHeight,
  onSave,
  onClose,
}: {
  width: number | null;
  height: number | null;
  naturalWidth: number;
  naturalHeight: number;
  onSave: (w: number | null, h: number | null) => void;
  onClose: () => void;
}) {
  const ar = naturalWidth / naturalHeight;
  const [wStr, setWStr] = useState(String(width ?? naturalWidth));
  const [hStr, setHStr] = useState(String(height ?? naturalHeight));
  const [locked, setLocked] = useState(true);
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

  function handleWidthChange(raw: string) {
    setWStr(raw);
    if (locked) {
      const val = Number(raw);
      if (val > 0) setHStr(String(Math.round(val / ar)));
    }
  }

  function handleHeightChange(raw: string) {
    setHStr(raw);
    if (locked) {
      const val = Number(raw);
      if (val > 0) setWStr(String(Math.round(val * ar)));
    }
  }

  function handleSave() {
    const w = Number(wStr);
    const h = Number(hStr);
    onSave(w > 0 ? w : null, h > 0 ? h : null);
  }

  return (
    <div
      ref={ref}
      className="absolute left-0 top-full mt-1 z-50 rounded-lg border border-gray-600 bg-gray-800 p-3 shadow-lg"
      style={{ minWidth: "200px" }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="mb-2 flex items-center gap-2">
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 text-xs text-white/80">
            <span className="w-10 shrink-0">Šířka</span>
            <input
              type="number"
              min={1}
              value={wStr}
              onChange={(e) => handleWidthChange(e.target.value)}
              onFocus={(e) => e.target.select()}
              className="w-20 rounded bg-gray-700 px-2 py-1 text-xs text-white outline-none"
            />
            <span className="text-white/40">px</span>
          </label>
          <label className="flex items-center gap-2 text-xs text-white/80">
            <span className="w-10 shrink-0">Výška</span>
            <input
              type="number"
              min={1}
              value={hStr}
              onChange={(e) => handleHeightChange(e.target.value)}
              onFocus={(e) => e.target.select()}
              className="w-20 rounded bg-gray-700 px-2 py-1 text-xs text-white outline-none"
            />
            <span className="text-white/40">px</span>
          </label>
        </div>
        <button
          type="button"
          className="ml-1 rounded p-1 text-white/60 transition-colors hover:bg-white/10 hover:text-white/90"
          title={locked ? "Odemknout poměr stran" : "Zamknout poměr stran"}
          onClick={() => setLocked(!locked)}
        >
          {locked ? <Link className="h-3.5 w-3.5" /> : <Unlink className="h-3.5 w-3.5" />}
        </button>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          className="flex-1 rounded bg-white/10 px-2 py-1 text-xs text-white/80 hover:bg-white/20"
          onClick={handleSave}
        >
          OK
        </button>
        <button
          type="button"
          className="flex-1 rounded bg-white/5 px-2 py-1 text-xs text-white/60 hover:bg-white/10"
          onClick={onClose}
        >
          Zrušit
        </button>
      </div>
    </div>
  );
}

// ── Main editor ──

export function ImageBlockEditor({
  block,
  onChange,
  onDelete,
  onCopy,
  onActiveChange,
}: ImageBlockEditorProps) {
  const [isSelected, setIsSelected] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [showSizePopover, setShowSizePopover] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const [search, setSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState<ImageDetailResponse | null>(null);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Drag state (resize handles)
  const dragRef = useRef<{
    dir: HandleDir;
    startX: number;
    startY: number;
    startW: number;
    startH: number;
  } | null>(null);

  const multiUpload = useMultiUpload({ isPublic: true });

  const itemsQuery = useQuery({
    queryKey: ["images", "picker", { search, pickerOpen: showPicker }],
    queryFn: () => imageApi.getImages({ search: search || undefined, limit: 50 }),
    enabled: showPicker,
  });

  const imageItems = (itemsQuery.data?.data?.items ?? []).filter((item) =>
    item.mimeType.startsWith("image/"),
  );

  // Close toolbar on outside click
  useEffect(() => {
    if (!isSelected) return;
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsSelected(false);
        setShowSizePopover(false);
        setShowMoreMenu(false);
        onActiveChange?.(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isSelected, onActiveChange]);

  function closeAllDropdowns() {
    setShowSizePopover(false);
    setShowMoreMenu(false);
  }

  function handleImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const img = e.currentTarget;
    setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
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
      onChange({
        ...block,
        src: selectedItem.url,
        altText: selectedItem.altText ?? selectedItem.originalFilename,
        mediaItemId: selectedItem.id,
        width: null,
        height: null,
        panX: 50,
        panY: 50,
      });
      setShowPicker(false);
      setSelectedItem(null);
      setNaturalSize(null);
    }
  }

  // ── Resize handle drag ──

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, dir: HandleDir) => {
      e.stopPropagation();
      e.preventDefault();

      const currentW = block.width ?? naturalSize?.w ?? 300;
      const currentH = block.height ?? naturalSize?.h ?? 200;

      dragRef.current = {
        dir,
        startX: e.clientX,
        startY: e.clientY,
        startW: currentW,
        startH: currentH,
      };
      (e.target as Element).setPointerCapture(e.pointerId);
    },
    [block.width, block.height, naturalSize],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragRef.current) return;
      e.preventDefault();

      const { dir, startX, startY, startW, startH } = dragRef.current;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      const ar = naturalSize ? naturalSize.w / naturalSize.h : startW / startH;

      const isCorner = dir.length === 2;
      let newW: number;
      let newH: number;

      if (isCorner) {
        // Proportional resize — both dimensions scale together
        const rawW = Math.max(50, startW + (dir.includes("e") ? dx : -dx));
        newW = Math.round(rawW);
        newH = Math.round(rawW / ar);
      } else {
        // Edge resize — change only the dragged dimension, keep the other
        newW = startW;
        newH = startH;
        if (dir === "e") newW = Math.max(50, Math.round(startW + dx));
        if (dir === "w") newW = Math.max(50, Math.round(startW - dx));
        if (dir === "s") newH = Math.max(30, Math.round(startH + dy));
        if (dir === "n") newH = Math.max(30, Math.round(startH - dy));
      }

      onChange({ ...block, width: newW, height: newH });
    },
    [block, naturalSize, onChange],
  );

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    dragRef.current = null;
    (e.target as Element).releasePointerCapture(e.pointerId);
  }, []);

  // ── Derived values ──

  const hasCrop = block.width !== null || block.height !== null;

  // Sliders only show when the image is non-proportionally cropped in that dimension
  const showVSlider =
    isSelected &&
    naturalSize !== null &&
    block.width !== null &&
    block.height !== null &&
    block.height < (block.width / naturalSize.w) * naturalSize.h - 1;

  const showHSlider =
    isSelected &&
    naturalSize !== null &&
    block.width !== null &&
    block.height !== null &&
    block.width < (block.height / naturalSize.h) * naturalSize.w - 1;

  return (
    <>
      <div
        ref={wrapperRef}
        className="relative cursor-pointer"
        onClick={() => {
          const next = !isSelected;
          setIsSelected(next);
          if (!next) closeAllDropdowns();
          onActiveChange?.(next);
        }}
      >
        {block.src ? (
          <>
            {/* ── Dark floating toolbar ── */}
            {isSelected && (
              <div
                className="absolute left-1/2 -translate-x-1/2 z-50 flex items-center rounded-lg bg-gray-800 px-1 py-1.5 shadow-lg"
                style={{ bottom: "calc(100% + 8px)" }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Upravit */}
                <button
                  type="button"
                  className="flex items-center gap-1 rounded px-2.5 py-1 text-xs text-white/90 transition-colors hover:bg-white/10 whitespace-nowrap"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePickerOpen();
                  }}
                >
                  <Pencil className="h-3 w-3" />
                  Upravit
                </button>

                <div className="mx-0.5 h-4 w-px bg-white/20" />

                {/* Velikost */}
                <div className="relative">
                  <button
                    type="button"
                    className="flex items-center gap-1 rounded px-2.5 py-1 text-xs text-white/90 transition-colors hover:bg-white/10 whitespace-nowrap"
                    onClick={() => {
                      setShowSizePopover(!showSizePopover);
                      setShowMoreMenu(false);
                    }}
                  >
                    Velikost
                    <ChevronDown className="h-3 w-3" />
                  </button>
                  {showSizePopover && naturalSize && (
                    <SizePopover
                      width={block.width}
                      height={block.height}
                      naturalWidth={naturalSize.w}
                      naturalHeight={naturalSize.h}
                      onSave={(w, h) => {
                        onChange({ ...block, width: w, height: h });
                        setShowSizePopover(false);
                      }}
                      onClose={() => setShowSizePopover(false)}
                    />
                  )}
                </div>

                <div className="mx-0.5 h-4 w-px bg-white/20" />

                {/* Obnovit */}
                <button
                  type="button"
                  className="flex items-center gap-1 rounded px-2.5 py-1 text-xs text-white/90 transition-colors hover:bg-white/10 whitespace-nowrap"
                  onClick={() => {
                    onChange({ ...block, width: null, height: null, panX: 50, panY: 50 });
                  }}
                >
                  <RotateCcw className="h-3 w-3" />
                  Obnovit
                </button>

                <div className="mx-0.5 h-4 w-px bg-white/20" />

                {/* Delete */}
                <button
                  type="button"
                  className="flex items-center rounded px-2 py-1 text-white/90 transition-colors hover:bg-white/10"
                  onClick={() => {
                    closeAllDropdowns();
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
                      setShowSizePopover(false);
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
                          setIsSelected(false);
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

            {/* ── Image preview area ── */}
            <div className="text-center">
              <div
                className="relative inline-block"
                style={{
                  maxWidth: "100%",
                  padding: "20px",
                  border: isSelected
                    ? "1px solid rgba(0,0,0,0.6)"
                    : isHovered
                      ? "1px dashed rgba(0,0,0,0.4)"
                      : "1px solid transparent",
                }}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
              >
                {/* Image (with or without crop) */}
                {hasCrop ? (
                  <div
                    style={{
                      width: block.width ? `${block.width}px` : undefined,
                      height: block.height ? `${block.height}px` : undefined,
                      overflow: "hidden",
                    }}
                    className="relative"
                  >
                    <img
                      ref={imgRef}
                      src={block.src}
                      alt={block.altText}
                      onLoad={handleImageLoad}
                      style={{
                        display: "block",
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        objectPosition: `${block.panX}% ${block.panY}%`,
                      }}
                    />

                    {/* Vertical pan slider (inside, right edge) */}
                    {showVSlider && (
                      <div
                        className="absolute top-1 bottom-1 right-1 flex items-center"
                        style={{ zIndex: 15 }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={block.panY}
                          onChange={(e) =>
                            onChange({ ...block, panY: Number(e.target.value) })
                          }
                          style={{
                            writingMode: "vertical-lr",
                            direction: "rtl",
                            height: "100%",
                            accentColor: "rgba(255,255,255,0.5)",
                            opacity: 0.6,
                          }}
                          className="cursor-pointer hover:opacity-100 transition-opacity"
                        />
                      </div>
                    )}

                    {/* Horizontal pan slider (inside, bottom edge) */}
                    {showHSlider && (
                      <div
                        className="absolute bottom-1 left-1 right-1 flex justify-center"
                        style={{ zIndex: 15 }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={block.panX}
                          onChange={(e) =>
                            onChange({ ...block, panX: Number(e.target.value) })
                          }
                          style={{
                            width: "100%",
                            accentColor: "rgba(255,255,255,0.5)",
                            opacity: 0.6,
                          }}
                          className="cursor-pointer hover:opacity-100 transition-opacity"
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <img
                    ref={imgRef}
                    src={block.src}
                    alt={block.altText}
                    onLoad={handleImageLoad}
                    className="max-w-full"
                    style={{ display: "block" }}
                  />
                )}

                {/* Resize handles (on the outline border) */}
                {isSelected &&
                  naturalSize !== null &&
                  HANDLE_DIRS.map((dir) => {
                    const pos = HANDLE_POSITIONS[dir];
                    return (
                      <div
                        key={dir}
                        style={{
                          position: "absolute",
                          top: pos.top,
                          left: pos.left,
                          transform: "translate(-50%, -50%)",
                          width: "8px",
                          height: "8px",
                          background: "white",
                          border: "1px solid #9ca3af",
                          borderRadius: "1px",
                          cursor: HANDLE_CURSORS[dir],
                          zIndex: 20,
                        }}
                        onClick={(e) => e.stopPropagation()}
                        onPointerDown={(e) => handlePointerDown(e, dir)}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                      />
                    );
                  })}
              </div>
            </div>
          </>
        ) : (
          <div
            className="flex h-48 cursor-pointer items-center justify-center rounded border-2 border-dashed border-[var(--border)] bg-[var(--muted)] hover:border-[rgb(6,93,77)] hover:bg-[rgb(6,93,77)]/5 mx-auto"
            onClick={(e) => {
              e.stopPropagation();
              handlePickerOpen();
            }}
          >
            <span className="text-[var(--muted-foreground)]">Klikni pro vložení obrázku</span>
          </div>
        )}
      </div>

      {/* ── Media picker dialog (preserved exactly) ── */}
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
              <p className="py-8 text-center text-sm text-[var(--muted-foreground)]">Načítání...</p>
            )}
            {itemsQuery.isSuccess && (
              <ImageGrid items={imageItems} selectedId={selectedItem?.id} onSelect={setSelectedItem} />
            )}
          </div>
          {multiUpload.uploads.length > 0 && (
            <div className="border-t border-[var(--border)] pt-3">
              <UploadProgress uploads={multiUpload.uploads} onCancel={multiUpload.cancelUpload} onClearDone={multiUpload.clearDone} />
            </div>
          )}
          <div className="flex items-center justify-between border-t border-[var(--border)] pt-4">
            <div className="flex items-center gap-2">
              <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} />
              <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={multiUpload.isUploading}>
                {multiUpload.isUploading ? "Nahrávám..." : "Nahrát obrázky"}
              </Button>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowPicker(false)}>Zrušit</Button>
              <Button type="button" size="sm" onClick={handleConfirmSelect} disabled={!selectedItem}>Vybrat</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
