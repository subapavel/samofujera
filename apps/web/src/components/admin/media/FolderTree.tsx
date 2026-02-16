import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { mediaApi } from "@samofujera/api-client";
import type { MediaFolderResponse } from "@samofujera/api-client";
import { Button, Input } from "@samofujera/ui";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

interface FolderTreeProps {
  folders: MediaFolderResponse[];
  selectedFolderId?: string;
  onSelect: (id?: string) => void;
  editable?: boolean;
}

export function FolderTree({
  folders,
  selectedFolderId,
  onSelect,
  editable,
}: FolderTreeProps) {
  const queryClient = useQueryClient();
  const [newFolderName, setNewFolderName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const createMutation = useMutation({
    mutationFn: (name: string) =>
      mediaApi.createFolder({ name, slug: slugify(name) }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["media", "folders"] });
      setNewFolderName("");
    },
  });

  const renameMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      mediaApi.renameFolder(id, { name, slug: slugify(name) }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["media", "folders"] });
      setRenamingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => mediaApi.deleteFolder(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["media", "folders"] });
      if (selectedFolderId === deleteMutation.variables) {
        onSelect(undefined);
      }
    },
  });

  function handleCreateFolder(e: React.FormEvent) {
    e.preventDefault();
    if (newFolderName.trim()) {
      createMutation.mutate(newFolderName.trim());
    }
  }

  function handleRenameSubmit(id: string) {
    if (renameValue.trim()) {
      renameMutation.mutate({ id, name: renameValue.trim() });
    }
  }

  function handleDeleteFolder(folder: MediaFolderResponse) {
    if (window.confirm(`Opravdu chcete smazat slozku "${folder.name}"?`)) {
      deleteMutation.mutate(folder.id);
    }
  }

  // Build tree structure: top-level first, then children indented
  const topLevel = folders.filter((f) => f.parentFolderId === null);
  const childrenOf = (parentId: string) =>
    folders.filter((f) => f.parentFolderId === parentId);

  function renderFolder(folder: MediaFolderResponse, depth: number) {
    const children = childrenOf(folder.id);
    const isSelected = folder.id === selectedFolderId;
    const isRenaming = renamingId === folder.id;

    return (
      <li key={folder.id}>
        <div
          className={`flex items-center gap-1 rounded-md px-2 py-1.5 text-sm transition-colors ${
            isSelected
              ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
              : "text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]"
          }`}
          style={{ paddingLeft: `${8 + depth * 16}px` }}
        >
          {isRenaming ? (
            <div className="flex flex-1 items-center gap-1">
              <Input
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRenameSubmit(folder.id);
                  if (e.key === "Escape") setRenamingId(null);
                }}
                className="h-6 text-xs"
                autoFocus
              />
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={() => onSelect(folder.id)}
                className="flex-1 text-left"
              >
                {folder.name}
              </button>
              {editable && (
                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 [div:hover>&]:opacity-100">
                  <button
                    type="button"
                    onClick={() => {
                      setRenamingId(folder.id);
                      setRenameValue(folder.name);
                    }}
                    className="rounded px-1 py-0.5 text-xs hover:bg-[var(--accent)]"
                    title="Prejmenovat"
                  >
                    ...
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteFolder(folder)}
                    className="rounded px-1 py-0.5 text-xs text-[var(--destructive)] hover:bg-[var(--destructive)]/10"
                    title="Smazat"
                  >
                    x
                  </button>
                </div>
              )}
            </>
          )}
        </div>
        {children.length > 0 && (
          <ul>
            {children.map((child) => renderFolder(child, depth + 1))}
          </ul>
        )}
      </li>
    );
  }

  return (
    <div>
      <ul className="space-y-0.5">
        <li>
          <button
            type="button"
            onClick={() => onSelect(undefined)}
            className={`w-full rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
              selectedFolderId === undefined
                ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                : "text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]"
            }`}
          >
            Vsechny soubory
          </button>
        </li>
        {topLevel.map((folder) => renderFolder(folder, 0))}
      </ul>

      {editable && (
        <form onSubmit={handleCreateFolder} className="mt-3 flex gap-1">
          <Input
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="Nova slozka..."
            className="h-8 text-xs"
            disabled={createMutation.isPending}
          />
          <Button
            type="submit"
            size="sm"
            disabled={createMutation.isPending || !newFolderName.trim()}
            className="h-8"
          >
            +
          </Button>
        </form>
      )}
    </div>
  );
}
