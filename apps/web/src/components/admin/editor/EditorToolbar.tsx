"use client";

import Link from "next/link";
import { Button, Input } from "@samofujera/ui";
import { ArrowLeft, Undo2, Redo2, Settings, Save, Eye } from "lucide-react";
import { t } from "@lingui/core/macro";
import { PublishSplitButton } from "./PublishSplitButton";

interface EditorToolbarProps {
  slug: string;
  title: string;
  onTitleChange: (title: string) => void;
  status: string;
  scheduledPublishAt: string | null;
  onSaveNow: () => void;
  onPublish: () => void;
  onUnpublish: () => void;
  onSchedule: (date: string) => void;
  onCancelSchedule: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  isDirty: boolean;
  isAutosaving: boolean;
  lastSavedAt: Date | null;
  onSettingsToggle: () => void;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" });
}

function SaveStatus({
  isDirty,
  isAutosaving,
  lastSavedAt,
}: {
  isDirty: boolean;
  isAutosaving: boolean;
  lastSavedAt: Date | null;
}) {
  if (isAutosaving) {
    return (
      <span className="text-xs text-[var(--muted-foreground)]">
        {t`Ukládání...`}
      </span>
    );
  }
  if (!isDirty && lastSavedAt) {
    return (
      <span className="text-xs text-[var(--muted-foreground)]">
        {t`Uloženo v ${formatTime(lastSavedAt)}`}
      </span>
    );
  }
  if (isDirty) {
    return (
      <span className="text-xs text-[var(--warning)]">
        {t`Neuložené změny`}
      </span>
    );
  }
  return null;
}

export function EditorToolbar({
  slug,
  title,
  onTitleChange,
  status,
  scheduledPublishAt,
  onSaveNow,
  onPublish,
  onUnpublish,
  onSchedule,
  onCancelSchedule,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  isDirty,
  isAutosaving,
  lastSavedAt,
  onSettingsToggle,
}: EditorToolbarProps) {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex h-12 items-center gap-2 border-b border-[var(--border)] bg-white px-4">
      {/* Back button */}
      <Button variant="ghost" size="sm" asChild>
        <Link href="/admin/stranky">
          <ArrowLeft className="h-4 w-4" />
        </Link>
      </Button>

      {/* Divider */}
      <div className="h-6 w-px bg-[var(--border)]" />

      {/* Page title input */}
      <Input
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        placeholder="Název stránky"
        className="max-w-xs border-none bg-transparent font-semibold focus-visible:ring-0"
      />

      {/* Save status indicator */}
      <SaveStatus isDirty={isDirty} isAutosaving={isAutosaving} lastSavedAt={lastSavedAt} />

      {/* Spacer */}
      <div className="flex-1" />

      {/* Publish split button */}
      <PublishSplitButton
        status={status}
        scheduledPublishAt={scheduledPublishAt}
        onPublish={onPublish}
        onUnpublish={onUnpublish}
        onSchedule={onSchedule}
        onCancelSchedule={onCancelSchedule}
      />

      {/* Divider */}
      <div className="h-6 w-px bg-[var(--border)]" />

      {/* Undo */}
      <Button variant="ghost" size="icon" onClick={onUndo} disabled={!canUndo}>
        <Undo2 className="h-4 w-4" />
      </Button>

      {/* Redo */}
      <Button variant="ghost" size="icon" onClick={onRedo} disabled={!canRedo}>
        <Redo2 className="h-4 w-4" />
      </Button>

      {/* Divider */}
      <div className="h-6 w-px bg-[var(--border)]" />

      {/* Preview */}
      <Button variant="ghost" size="icon" asChild>
        <Link href={`/${slug}?preview=true`} target="_blank" title="Náhled">
          <Eye className="h-4 w-4" />
        </Link>
      </Button>

      {/* Settings */}
      <Button variant="ghost" size="icon" onClick={onSettingsToggle}>
        <Settings className="h-4 w-4" />
      </Button>

      {/* Save */}
      <Button size="sm" onClick={onSaveNow} disabled={isAutosaving || !isDirty}>
        <Save className="h-4 w-4" />
        {isAutosaving ? t`Ukládání...` : t`Uložit`}
      </Button>
    </div>
  );
}
