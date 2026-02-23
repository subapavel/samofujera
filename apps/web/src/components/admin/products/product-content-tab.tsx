"use client";

import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { t } from "@lingui/core/macro";
import { productContentApi } from "@samofujera/api-client";
import type { ContentResponse } from "@samofujera/api-client/src/types";
import {
  Button,
  Input,
  Label,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Checkbox,
} from "@samofujera/ui";
import { formatFileSize } from "../images/format-file-size";

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function contentTypeBadgeVariant(
  contentType: string,
): "default" | "secondary" | "outline" {
  switch (contentType) {
    case "VIDEO":
      return "default";
    case "AUDIO":
      return "secondary";
    default:
      return "outline";
  }
}

function contentTypeLabel(contentType: string): string {
  switch (contentType) {
    case "VIDEO":
      return "Video";
    case "AUDIO":
      return "Audio";
    case "FILE":
      return t`Soubor`;
    default:
      return contentType;
  }
}

interface ProductContentTabProps {
  productId: string;
  contentItems: ContentResponse[];
  onInvalidate: () => Promise<void>;
}

export function ProductContentTab({
  productId,
  contentItems,
  onInvalidate,
}: ProductContentTabProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [dragSourceIndex, setDragSourceIndex] = useState<number | null>(null);

  // Stream form state
  const [streamTitle, setStreamTitle] = useState("");
  const [streamType, setStreamType] = useState<"VIDEO" | "AUDIO">("VIDEO");
  const [streamUid, setStreamUid] = useState("");
  const [showStreamForm, setShowStreamForm] = useState(false);

  const uploadMutation = useMutation({
    mutationFn: (file: File) =>
      productContentApi.uploadContent(productId, file, file.name),
    onSuccess: async () => {
      await onInvalidate();
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
  });

  const linkStreamMutation = useMutation({
    mutationFn: () =>
      productContentApi.linkStream(productId, {
        title: streamTitle,
        contentType: streamType,
        streamUid: streamUid || "",
      }),
    onSuccess: async () => {
      await onInvalidate();
      setStreamTitle("");
      setStreamUid("");
      setShowStreamForm(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (contentId: string) =>
      productContentApi.deleteContent(productId, contentId),
    onSuccess: onInvalidate,
  });

  const updateMutation = useMutation({
    mutationFn: ({
      contentId,
      data,
    }: {
      contentId: string;
      data: { title?: string; isPreview?: boolean };
    }) => productContentApi.updateContent(productId, contentId, data),
    onSuccess: onInvalidate,
  });

  const reorderMutation = useMutation({
    mutationFn: (contentIds: string[]) =>
      productContentApi.reorderContent(productId, contentIds),
    onSuccess: onInvalidate,
  });

  function handleUploadFile() {
    const file = fileInputRef.current?.files?.[0];
    if (file) uploadMutation.mutate(file);
  }

  function handleDelete(item: ContentResponse) {
    if (window.confirm(t`Opravdu chcete smazat "${item.title}"?`)) {
      deleteMutation.mutate(item.id);
    }
  }

  function handleTogglePreview(item: ContentResponse) {
    updateMutation.mutate({
      contentId: item.id,
      data: { isPreview: !item.isPreview },
    });
  }

  function handleLinkStream(event: React.FormEvent) {
    event.preventDefault();
    linkStreamMutation.mutate();
  }

  function handleDragStart(index: number) {
    setDragSourceIndex(index);
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    setDragOverIndex(index);
  }

  function handleDrop(targetIndex: number) {
    if (dragSourceIndex === null || dragSourceIndex === targetIndex) {
      setDragOverIndex(null);
      setDragSourceIndex(null);
      return;
    }
    const newOrder = [...contentItems];
    const [moved] = newOrder.splice(dragSourceIndex, 1);
    newOrder.splice(targetIndex, 0, moved);
    reorderMutation.mutate(newOrder.map((item) => item.id));
    setDragOverIndex(null);
    setDragSourceIndex(null);
  }

  const isPending =
    uploadMutation.isPending ||
    linkStreamMutation.isPending ||
    deleteMutation.isPending ||
    updateMutation.isPending ||
    reorderMutation.isPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t`Obsah produktu`}</CardTitle>
      </CardHeader>
      <CardContent>
        {contentItems.length > 0 ? (
          <div className="mb-4 space-y-2">
            {contentItems.map((item, index) => (
              <div
                key={item.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={() => handleDrop(index)}
                onDragEnd={() => {
                  setDragOverIndex(null);
                  setDragSourceIndex(null);
                }}
                className={`flex items-center gap-3 rounded-md border border-[var(--border)] p-3 ${
                  dragOverIndex === index
                    ? "ring-2 ring-[var(--ring)]"
                    : ""
                }`}
              >
                {/* Drag handle */}
                <div className="cursor-grab text-[var(--muted-foreground)]">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                  >
                    <circle cx="5" cy="3" r="1.5" />
                    <circle cx="11" cy="3" r="1.5" />
                    <circle cx="5" cy="8" r="1.5" />
                    <circle cx="11" cy="8" r="1.5" />
                    <circle cx="5" cy="13" r="1.5" />
                    <circle cx="11" cy="13" r="1.5" />
                  </svg>
                </div>

                {/* Content info */}
                <div className="flex-1 space-y-0.5">
                  <p className="text-sm font-medium">{item.title}</p>
                  <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
                    <Badge variant={contentTypeBadgeVariant(item.contentType)}>
                      {contentTypeLabel(item.contentType)}
                    </Badge>
                    {item.mimeType && <span>{item.mimeType}</span>}
                    {item.fileSizeBytes != null && (
                      <span>{formatFileSize(item.fileSizeBytes)}</span>
                    )}
                    {item.durationSeconds != null && (
                      <span>{formatDuration(item.durationSeconds)}</span>
                    )}
                    {item.streamUid && (
                      <span>CF: {item.streamUid.slice(0, 8)}...</span>
                    )}
                  </div>
                </div>

                {/* Preview checkbox */}
                <label className="flex items-center gap-1.5 text-xs">
                  <Checkbox
                    checked={item.isPreview}
                    onCheckedChange={() => handleTogglePreview(item)}
                    disabled={isPending}
                  />
                  {t`Ukázka`}
                </label>

                {/* Delete */}
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={isPending}
                  onClick={() => handleDelete(item)}
                >
                  {t`Smazat`}
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="mb-4 text-sm text-[var(--muted-foreground)]">
            {t`Žádný nahraný obsah.`}
          </p>
        )}

        {/* Upload file */}
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <Label htmlFor="contentFileUpload">{t`Nahrát soubor`}</Label>
            <input
              ref={fileInputRef}
              id="contentFileUpload"
              type="file"
              className="block w-full text-sm text-[var(--muted-foreground)] file:mr-2 file:rounded-md file:border-0 file:bg-[var(--primary)] file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-[var(--primary-foreground)]"
            />
          </div>
          <Button
            type="button"
            onClick={handleUploadFile}
            disabled={isPending}
          >
            {uploadMutation.isPending ? t`Nahrávám...` : t`Nahrát`}
          </Button>
        </div>

        {/* Link stream video */}
        <div className="mt-3">
          {!showStreamForm ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowStreamForm(true)}
            >
              {t`Přidat video/audio`}
            </Button>
          ) : (
            <form
              onSubmit={handleLinkStream}
              className="space-y-3 rounded-md border border-[var(--border)] p-4"
            >
              <p className="text-sm font-medium">{t`Přidat stream médium`}</p>
              <div className="flex gap-3">
                <div className="flex-1">
                  <Label htmlFor="streamTitle" className="text-xs">
                    {t`Název`}
                  </Label>
                  <Input
                    id="streamTitle"
                    value={streamTitle}
                    onChange={(e) => setStreamTitle(e.target.value)}
                    required
                    disabled={isPending}
                  />
                </div>
                <div className="w-32">
                  <Label htmlFor="streamType" className="text-xs">
                    {t`Typ`}
                  </Label>
                  <Select
                    value={streamType}
                    onValueChange={(value) =>
                      setStreamType(value as "VIDEO" | "AUDIO")
                    }
                    disabled={isPending}
                  >
                    <SelectTrigger id="streamType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="VIDEO">{t`Video`}</SelectItem>
                      <SelectItem value="AUDIO">{t`Audio`}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="streamUid" className="text-xs">
                  CF Stream UID
                </Label>
                <Input
                  id="streamUid"
                  value={streamUid}
                  onChange={(e) => setStreamUid(e.target.value)}
                  placeholder={t`volitelné`}
                  disabled={isPending}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="submit"
                  size="sm"
                  disabled={isPending || !streamTitle}
                >
                  {linkStreamMutation.isPending
                    ? t`Přidávám...`
                    : t`Přidat médium`}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowStreamForm(false)}
                >
                  {t`Zrušit`}
                </Button>
              </div>
              {linkStreamMutation.isError && (
                <p className="text-sm text-[var(--destructive)]">
                  {t`Nepodařilo se přidat médium.`}
                </p>
              )}
            </form>
          )}
        </div>

        {(uploadMutation.isError || deleteMutation.isError) && (
          <p className="mt-2 text-sm text-[var(--destructive)]">
            {t`Operace se nezdařila. Zkuste to prosím znovu.`}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
