import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { mediaApi } from "@samofujera/api-client";
import type { MediaItemResponse } from "@samofujera/api-client";
import { Button, Input, Label } from "@samofujera/ui";
import { FolderTree } from "../media/FolderTree";
import { MediaGrid } from "../media/MediaGrid";

const textareaClassName =
  "flex w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm ring-offset-[var(--background)] placeholder:text-[var(--muted-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2";

export function MediaPage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFolderId, setSelectedFolderId] = useState<string | undefined>(
    undefined,
  );
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [page, setPage] = useState(1);
  const [selectedItem, setSelectedItem] = useState<MediaItemResponse | null>(
    null,
  );
  const [editAltText, setEditAltText] = useState("");

  const foldersQuery = useQuery({
    queryKey: ["media", "folders"],
    queryFn: () => mediaApi.getFolders(),
  });

  const itemsQuery = useQuery({
    queryKey: [
      "media",
      "items",
      { folderId: selectedFolderId, type: typeFilter, search, page },
    ],
    queryFn: () =>
      mediaApi.getItems({
        folderId: selectedFolderId,
        type: typeFilter || undefined,
        search: search || undefined,
        page,
        limit: 24,
      }),
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => mediaApi.uploadDirect(file, selectedFolderId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["media", "items"] });
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
  });

  const updateAltTextMutation = useMutation({
    mutationFn: ({ id, altText }: { id: string; altText: string }) =>
      mediaApi.updateItem(id, { altText }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["media", "items"] });
      if (selectedItem) {
        setSelectedItem({ ...selectedItem, altText: editAltText });
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => mediaApi.deleteItem(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["media", "items"] });
      setSelectedItem(null);
    },
  });

  function handleUpload() {
    const file = fileInputRef.current?.files?.[0];
    if (file) uploadMutation.mutate(file);
  }

  function handleSelectItem(item: MediaItemResponse) {
    setSelectedItem(item);
    setEditAltText(item.altText ?? "");
  }

  function handleSaveAltText() {
    if (selectedItem) {
      updateAltTextMutation.mutate({
        id: selectedItem.id,
        altText: editAltText,
      });
    }
  }

  function handleDeleteItem() {
    if (
      selectedItem &&
      window.confirm(
        `Opravdu chcete smazat "${selectedItem.originalFilename}"?`,
      )
    ) {
      deleteMutation.mutate(selectedItem.id);
    }
  }

  const data = itemsQuery.data?.data;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold">Media</h2>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleUpload}
          />
          <Button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadMutation.isPending}
          >
            {uploadMutation.isPending ? "Nahravam..." : "Nahrat soubor"}
          </Button>
        </div>
      </div>

      {uploadMutation.isError && (
        <p className="mb-4 text-sm text-[var(--destructive)]">
          Nepodarilo se nahrat soubor. Zkuste to prosim znovu.
        </p>
      )}

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-56 shrink-0">
          <p className="mb-2 text-xs font-medium uppercase text-[var(--muted-foreground)]">
            Slozky
          </p>
          <FolderTree
            folders={foldersQuery.data?.data ?? []}
            selectedFolderId={selectedFolderId}
            onSelect={(id) => {
              setSelectedFolderId(id);
              setPage(1);
            }}
            editable
          />
        </div>

        {/* Main area */}
        <div className="flex-1">
          {/* Filters */}
          <div className="mb-4 flex gap-3">
            <Input
              placeholder="Hledat..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="max-w-xs"
            />
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
            >
              <option value="">Vsechny typy</option>
              <option value="IMAGE">Obrazky</option>
              <option value="DOCUMENT">Dokumenty</option>
              <option value="AUDIO">Audio</option>
              <option value="VIDEO">Video</option>
            </select>
          </div>

          <div className="flex gap-6">
            {/* Grid */}
            <div className="flex-1">
              {itemsQuery.isLoading && (
                <p className="py-8 text-center text-sm text-[var(--muted-foreground)]">
                  Nacitani...
                </p>
              )}

              {itemsQuery.isError && (
                <p className="py-8 text-center text-sm text-[var(--destructive)]">
                  Nepodarilo se nacist soubory. Zkuste to prosim znovu.
                </p>
              )}

              {itemsQuery.isSuccess && (
                <>
                  <MediaGrid
                    items={data?.items ?? []}
                    selectedId={selectedItem?.id}
                    onSelect={handleSelectItem}
                  />

                  {/* Pagination */}
                  {data && data.totalPages > 1 && (
                    <div className="mt-4 flex items-center justify-between">
                      <p className="text-sm text-[var(--muted-foreground)]">
                        Stranka {data.page} z {data.totalPages} (
                        {data.totalItems} souboru)
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={page <= 1}
                          onClick={() => setPage((p) => p - 1)}
                        >
                          Predchozi
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={page >= data.totalPages}
                          onClick={() => setPage((p) => p + 1)}
                        >
                          Dalsi
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Detail panel */}
            {selectedItem && (
              <div className="w-64 shrink-0 rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
                <h3 className="mb-3 text-sm font-medium">Detail</h3>

                {selectedItem.mimeType.startsWith("image/") && (
                  <img
                    src={selectedItem.url}
                    alt={selectedItem.altText ?? selectedItem.originalFilename}
                    className="mb-3 w-full rounded-md border border-[var(--border)] object-cover"
                  />
                )}

                <p className="mb-1 truncate text-sm font-medium">
                  {selectedItem.originalFilename}
                </p>
                <p className="mb-3 text-xs text-[var(--muted-foreground)]">
                  {selectedItem.mimeType}
                  {selectedItem.width != null &&
                    selectedItem.height != null &&
                    ` - ${selectedItem.width}x${selectedItem.height}`}
                </p>

                <div className="mb-3">
                  <Label htmlFor="altText" className="text-xs">
                    Alt text
                  </Label>
                  <textarea
                    id="altText"
                    value={editAltText}
                    onChange={(e) => setEditAltText(e.target.value)}
                    rows={2}
                    className={textareaClassName}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="mt-1"
                    onClick={handleSaveAltText}
                    disabled={
                      updateAltTextMutation.isPending ||
                      editAltText === (selectedItem.altText ?? "")
                    }
                  >
                    {updateAltTextMutation.isPending
                      ? "Ukladam..."
                      : "Ulozit alt text"}
                  </Button>
                </div>

                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="w-full"
                  onClick={handleDeleteItem}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? "Mazani..." : "Smazat soubor"}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
