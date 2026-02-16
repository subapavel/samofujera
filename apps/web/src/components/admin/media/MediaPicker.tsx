import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { mediaApi } from "@samofujera/api-client";
import type { MediaItemResponse } from "@samofujera/api-client";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@samofujera/ui";
import { FolderTree } from "./FolderTree";
import { MediaGrid } from "./MediaGrid";

interface MediaPickerProps {
  value: string | null;
  onChange: (id: string | null) => void;
  accept?: string;
}

export function MediaPicker({ value, onChange, accept }: MediaPickerProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState<string | undefined>(
    undefined,
  );
  const [selectedItem, setSelectedItem] = useState<MediaItemResponse | null>(
    null,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentItemQuery = useQuery({
    queryKey: ["media", "item", value],
    queryFn: () => mediaApi.getItem(value!),
    enabled: Boolean(value),
  });

  const foldersQuery = useQuery({
    queryKey: ["media", "folders"],
    queryFn: () => mediaApi.getFolders(),
    enabled: open,
  });

  const itemsQuery = useQuery({
    queryKey: ["media", "items", { folderId: selectedFolderId }],
    queryFn: () =>
      mediaApi.getItems({
        folderId: selectedFolderId,
        type: accept?.startsWith("image/") ? "IMAGE" : undefined,
        limit: 50,
      }),
    enabled: open,
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => mediaApi.uploadDirect(file, selectedFolderId),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: ["media", "items"] });
      onChange(response.data.id);
      setOpen(false);
    },
  });

  function handleUpload() {
    const file = fileInputRef.current?.files?.[0];
    if (file) {
      uploadMutation.mutate(file);
    }
  }

  function handleSelect(item: MediaItemResponse) {
    setSelectedItem(item);
  }

  function handleConfirmSelect() {
    if (selectedItem) {
      onChange(selectedItem.id);
      setOpen(false);
      setSelectedItem(null);
    }
  }

  function handleRemove() {
    onChange(null);
  }

  const currentItem = currentItemQuery.data?.data;
  const isImage = currentItem?.mimeType.startsWith("image/");

  return (
    <div>
      {value && currentItem ? (
        <div className="flex items-center gap-3">
          {isImage ? (
            <img
              src={currentItem.url}
              alt={currentItem.altText ?? currentItem.originalFilename}
              className="h-16 w-16 rounded-md border border-[var(--border)] object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--muted)] text-xs text-[var(--muted-foreground)]">
              {currentItem.originalFilename.split(".").pop()?.toUpperCase()}
            </div>
          )}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(true)}
            >
              Zmenit
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleRemove}
            >
              Odebrat
            </Button>
          </div>
        </div>
      ) : (
        <Button type="button" variant="outline" onClick={() => setOpen(true)}>
          Vybrat obrazek
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Vybrat soubor</DialogTitle>
          </DialogHeader>

          <div className="flex gap-4">
            {/* Folder sidebar */}
            <div className="w-48 shrink-0 border-r border-[var(--border)] pr-4">
              <FolderTree
                folders={foldersQuery.data?.data ?? []}
                selectedFolderId={selectedFolderId}
                onSelect={setSelectedFolderId}
              />
            </div>

            {/* Grid area */}
            <div className="min-h-[300px] flex-1">
              {itemsQuery.isLoading && (
                <p className="py-8 text-center text-sm text-[var(--muted-foreground)]">
                  Nacitani...
                </p>
              )}

              {itemsQuery.isSuccess && (
                <MediaGrid
                  items={itemsQuery.data.data.items}
                  selectedId={selectedItem?.id}
                  onSelect={handleSelect}
                />
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between border-t border-[var(--border)] pt-4">
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept={accept}
                className="hidden"
                onChange={handleUpload}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadMutation.isPending}
              >
                {uploadMutation.isPending ? "Nahravam..." : "Nahrat novy"}
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setOpen(false)}
              >
                Zrusit
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleConfirmSelect}
                disabled={!selectedItem}
              >
                Vybrat
              </Button>
            </div>
          </div>

          {uploadMutation.isError && (
            <p className="text-sm text-[var(--destructive)]">
              Nepodarilo se nahrat soubor. Zkuste to prosim znovu.
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
