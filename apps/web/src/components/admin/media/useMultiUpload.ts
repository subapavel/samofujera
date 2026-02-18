"use client";

import { useState, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { mediaApi } from "@samofujera/api-client";

export interface UploadItem {
  id: string;
  file: File;
  progress: number;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
}

interface UseMultiUploadOptions {
  onAllDone?: () => void;
}

export function useMultiUpload(options?: UseMultiUploadOptions) {
  const queryClient = useQueryClient();
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const abortFns = useRef<Map<string, () => void>>(new Map());

  const updateUpload = useCallback(
    (id: string, patch: Partial<UploadItem>) => {
      setUploads((prev) =>
        prev.map((u) => (u.id === id ? { ...u, ...patch } : u)),
      );
    },
    [],
  );

  const uploadFile = useCallback(
    (item: UploadItem) => {
      const { promise, abort } = mediaApi.uploadWithProgress(
        item.file,
        (progress) => updateUpload(item.id, { progress, status: "uploading" }),
      );

      abortFns.current.set(item.id, abort);

      promise
        .then(() => {
          updateUpload(item.id, { progress: 100, status: "done" });
          abortFns.current.delete(item.id);
          void queryClient.invalidateQueries({ queryKey: ["media", "items"] });
        })
        .catch((err: Error) => {
          if (err.message !== "Upload cancelled") {
            updateUpload(item.id, { status: "error", error: err.message });
          }
          abortFns.current.delete(item.id);
        });
    },
    [updateUpload, queryClient],
  );

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const newItems: UploadItem[] = Array.from(files).map((file) => ({
        id: crypto.randomUUID(),
        file,
        progress: 0,
        status: "pending" as const,
      }));

      setUploads((prev) => [...prev, ...newItems]);

      for (const item of newItems) {
        uploadFile(item);
      }
    },
    [uploadFile],
  );

  const cancelUpload = useCallback(
    (id: string) => {
      const abort = abortFns.current.get(id);
      if (abort) abort();
      setUploads((prev) => prev.filter((u) => u.id !== id));
    },
    [],
  );

  const clearDone = useCallback(() => {
    setUploads((prev) => prev.filter((u) => u.status !== "done"));
    options?.onAllDone?.();
  }, [options]);

  const isUploading = uploads.some(
    (u) => u.status === "pending" || u.status === "uploading",
  );

  const doneCount = uploads.filter((u) => u.status === "done").length;

  return { uploads, addFiles, cancelUpload, clearDone, isUploading, doneCount };
}
