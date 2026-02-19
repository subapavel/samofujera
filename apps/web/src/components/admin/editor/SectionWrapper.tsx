"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
import { Plus, Settings, LayoutTemplate, Trash2, AlertTriangle } from "lucide-react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@samofujera/ui";

interface SectionWrapperProps {
  sectionId: string;
  onDelete: () => void;
  onAddBefore: () => void;
  onAddAfter: () => void;
  children: ReactNode;
}

export function SectionWrapper({
  sectionId,
  onDelete,
  onAddBefore,
  onAddAfter,
  children,
}: SectionWrapperProps) {
  const [hovered, setHovered] = useState(false);
  const [edge, setEdge] = useState<"top" | "bottom" | null>(null);
  const [placeholder, setPlaceholder] = useState<"top" | "bottom" | null>(null);
  const [popoverEdge, setPopoverEdge] = useState<"top" | "bottom" | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const relativeY = (e.clientY - rect.top) / rect.height;

    if (relativeY < 0.15) {
      setEdge("top");
    } else if (relativeY > 0.85) {
      setEdge("bottom");
    } else {
      setEdge(null);
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (!popoverEdge && !settingsOpen) {
      setHovered(false);
      setEdge(null);
    }
  }, [popoverEdge, settingsOpen]);

  function handlePopoverChange(open: boolean, position: "top" | "bottom") {
    if (open) {
      setPopoverEdge(position);
      setPlaceholder(position);
    } else {
      setPopoverEdge(null);
      setPlaceholder(null);
    }
  }

  function handleAdd(position: "top" | "bottom") {
    setPopoverEdge(null);
    setPlaceholder(null);
    setHovered(false);
    setEdge(null);
    if (position === "top") {
      onAddBefore();
    } else {
      onAddAfter();
    }
  }

  function handleDeleteClick() {
    setSettingsOpen(false);
    setConfirmDeleteOpen(true);
  }

  function handleConfirmDelete() {
    setConfirmDeleteOpen(false);
    setHovered(false);
    setEdge(null);
    onDelete();
  }

  const showEdgeUI = hovered || popoverEdge !== null || settingsOpen;

  return (
    <>
      {/* Dark placeholder above section */}
      {placeholder === "top" && (
        <div className="mx-auto max-w-[935px] px-5 mb-2">
          <div className="flex h-20 items-center justify-center rounded-lg bg-gray-900/80 text-sm text-white/60">
            Nová sekce
          </div>
        </div>
      )}

      {/* Full-width hover zone */}
      <div
        ref={containerRef}
        className="relative py-8"
        data-section-id={sectionId}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={handleMouseLeave}
        onMouseMove={handleMouseMove}
      >
        {/* Content constrained to container width */}
        <div className="mx-auto max-w-[935px] px-5">
          {children}
        </div>

        {/* Settings gear — top right corner of the section, far right */}
        {showEdgeUI && (
          <div className="absolute top-2 right-4 z-20">
            <Popover open={settingsOpen} onOpenChange={setSettingsOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border)] bg-white/80 text-[var(--muted-foreground)] transition-colors hover:bg-white hover:text-[var(--foreground)]"
                  title="Nastavení sekce"
                >
                  <Settings className="h-4 w-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-2" side="left" align="start">
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50"
                  onClick={handleDeleteClick}
                >
                  <Trash2 className="h-4 w-4" />
                  Odstranit sekci
                </button>
              </PopoverContent>
            </Popover>
          </div>
        )}

        {/* Top edge: full-width thick line + big + button with popover */}
        {showEdgeUI && (edge === "top" || popoverEdge === "top") && (
          <div className="absolute top-0 inset-x-0 flex items-center justify-center z-30 -translate-y-1/2">
            <div className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 bg-[rgb(6,93,77)]" />
            <Popover
              open={popoverEdge === "top"}
              onOpenChange={(open) => handlePopoverChange(open, "top")}
            >
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 border-[rgb(6,93,77)] bg-white text-[rgb(6,93,77)] transition-colors hover:bg-[rgb(6,93,77)] hover:text-white"
                  title="Přidat sekci nad"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-3" side="top" align="center">
                <p className="mb-2 text-sm font-semibold">Přidat sekci</p>
                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-lg border border-[var(--border)] p-3 text-sm font-medium transition-colors hover:border-[rgb(6,93,77)] hover:bg-[rgb(6,93,77)]/5"
                  onClick={() => handleAdd("top")}
                >
                  <LayoutTemplate className="h-5 w-5 text-[var(--muted-foreground)]" />
                  Výchozí
                </button>
              </PopoverContent>
            </Popover>
          </div>
        )}

        {/* Bottom edge: full-width thick line + big + button with popover */}
        {showEdgeUI && (edge === "bottom" || popoverEdge === "bottom") && (
          <div className="absolute bottom-0 inset-x-0 flex items-center justify-center z-30 translate-y-1/2">
            <div className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 bg-[rgb(6,93,77)]" />
            <Popover
              open={popoverEdge === "bottom"}
              onOpenChange={(open) => handlePopoverChange(open, "bottom")}
            >
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 border-[rgb(6,93,77)] bg-white text-[rgb(6,93,77)] transition-colors hover:bg-[rgb(6,93,77)] hover:text-white"
                  title="Přidat sekci pod"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-3" side="bottom" align="center">
                <p className="mb-2 text-sm font-semibold">Přidat sekci</p>
                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-lg border border-[var(--border)] p-3 text-sm font-medium transition-colors hover:border-[rgb(6,93,77)] hover:bg-[rgb(6,93,77)]/5"
                  onClick={() => handleAdd("bottom")}
                >
                  <LayoutTemplate className="h-5 w-5 text-[var(--muted-foreground)]" />
                  Výchozí
                </button>
              </PopoverContent>
            </Popover>
          </div>
        )}
      </div>

      {/* Dark placeholder below section */}
      {placeholder === "bottom" && (
        <div className="mx-auto max-w-[935px] px-5 mt-2">
          <div className="flex h-20 items-center justify-center rounded-lg bg-gray-900/80 text-sm text-white/60">
            Nová sekce
          </div>
        </div>
      )}

      {/* Delete confirmation alert dialog */}
      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border-2 border-blue-400 text-blue-400">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <AlertDialogTitle className="text-lg font-bold">
                  Opravdu chcete odstranit tuto sekci?
                </AlertDialogTitle>
                <AlertDialogDescription className="mt-1">
                  Varování: Smazaný obsah bude nenávratně pryč.
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 sm:justify-start">
            <AlertDialogAction
              className="bg-sky-500 text-white hover:bg-sky-600 px-8"
              onClick={handleConfirmDelete}
            >
              Odstranit
            </AlertDialogAction>
            <AlertDialogCancel className="px-8">
              Zavřít
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
