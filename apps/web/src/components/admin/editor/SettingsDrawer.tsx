"use client";

import {
  Input,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@samofujera/ui";

interface SettingsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slug: string;
  onSlugChange: (slug: string) => void;
  metaTitle: string;
  onMetaTitleChange: (title: string) => void;
  metaDescription: string;
  onMetaDescriptionChange: (desc: string) => void;
}

export function SettingsDrawer({
  open,
  onOpenChange,
  slug,
  onSlugChange,
  metaTitle,
  onMetaTitleChange,
  metaDescription,
  onMetaDescriptionChange,
}: SettingsDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[400px]">
        <SheetHeader>
          <SheetTitle>Nastavení stránky</SheetTitle>
        </SheetHeader>
        <div className="space-y-6 py-6">
          {/* Slug */}
          <div>
            <label className="mb-1.5 block text-sm font-medium">URL adresa</label>
            <div className="flex items-center gap-1">
              <span className="text-sm text-[var(--muted-foreground)]">/pages/</span>
              <Input
                value={slug}
                onChange={(e) => onSlugChange(e.target.value)}
                placeholder="url-stranky"
              />
            </div>
          </div>

          {/* Meta title */}
          <div>
            <label className="mb-1.5 block text-sm font-medium">Meta titulek</label>
            <Input
              value={metaTitle}
              onChange={(e) => onMetaTitleChange(e.target.value)}
              placeholder="Titulek pro vyhledávače"
            />
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              {metaTitle.length}/200 znaků
            </p>
          </div>

          {/* Meta description */}
          <div>
            <label className="mb-1.5 block text-sm font-medium">Meta popis</label>
            <textarea
              value={metaDescription}
              onChange={(e) => onMetaDescriptionChange(e.target.value)}
              placeholder="Krátký popis pro vyhledávače"
              rows={3}
              className="flex w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              {metaDescription.length}/500 znaků
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
