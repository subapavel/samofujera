"use client";

import { t } from "@lingui/core/macro";
import { Button } from "@samofujera/ui";
import type { UploadItem } from "./useMultiUpload";

interface UploadProgressProps {
  uploads: UploadItem[];
  onCancel: (id: string) => void;
  onClearDone: () => void;
}

export function UploadProgress({
  uploads,
  onCancel,
  onClearDone,
}: UploadProgressProps) {
  if (uploads.length === 0) return null;

  const doneCount = uploads.filter((u) => u.status === "done").length;
  const allDone = doneCount === uploads.length;

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-medium">
          {t`Nahrávání`} ({doneCount}/{uploads.length})
        </p>
        {allDone && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClearDone}
          >
            {t`Zavřít`}
          </Button>
        )}
      </div>
      <div className="space-y-2">
        {uploads.map((upload) => (
          <div key={upload.id} className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs">{upload.file.name}</p>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[var(--muted)]">
                <div
                  className={`h-full rounded-full transition-all duration-200 ${
                    upload.status === "error"
                      ? "bg-[var(--destructive)]"
                      : upload.status === "done"
                        ? "bg-emerald-500"
                        : "bg-[var(--primary)]"
                  }`}
                  style={{ width: `${upload.progress}%` }}
                />
              </div>
            </div>
            <div className="flex w-16 shrink-0 items-center justify-end">
              {upload.status === "uploading" && (
                <>
                  <span className="mr-1 text-xs text-[var(--muted-foreground)]">
                    {upload.progress}%
                  </span>
                  <button
                    type="button"
                    className="text-xs text-[var(--muted-foreground)] hover:text-[var(--destructive)]"
                    onClick={() => onCancel(upload.id)}
                  >
                    X
                  </button>
                </>
              )}
              {upload.status === "done" && (
                <span className="text-xs text-emerald-500">{t`Hotovo`}</span>
              )}
              {upload.status === "error" && (
                <span className="text-xs text-[var(--destructive)]">
                  {t`Chyba`}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
