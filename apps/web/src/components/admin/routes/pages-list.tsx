"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { pageAdminApi } from "@samofujera/api-client";
import {
  Button,
  Input,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@samofujera/ui";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Koncept",
  PUBLISHED: "Publikováno",
  ARCHIVED: "Archivováno",
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  PUBLISHED: "bg-green-100 text-green-700",
  ARCHIVED: "bg-red-100 text-red-700",
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("cs-CZ");
}

export function PagesListPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newSlug, setNewSlug] = useState("");

  const pagesQuery = useQuery({
    queryKey: ["admin", "pages", { page, status: statusFilter, search }],
    queryFn: () =>
      pageAdminApi.getPages({
        page,
        limit: 20,
        status: statusFilter || undefined,
        search: search || undefined,
      }),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      pageAdminApi.createPage({
        slug: newSlug,
        title: newTitle,
      }),
    onSuccess: (response) => {
      setShowCreateDialog(false);
      setNewTitle("");
      setNewSlug("");
      router.push(`/admin/stranky/${response.data.id}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => pageAdminApi.deletePage(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "pages"] });
    },
  });

  function handleDelete(id: string, title: string) {
    if (window.confirm(`Opravdu chcete smazat stránku "${title}"?`)) {
      deleteMutation.mutate(id);
    }
  }

  function handleTitleChange(value: string) {
    setNewTitle(value);
    setNewSlug(slugify(value));
  }

  const data = pagesQuery.data?.data;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold">Stránky</h2>
        <Button onClick={() => setShowCreateDialog(true)}>Nová stránka</Button>
      </div>

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
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
        >
          <option value="">Všechny stavy</option>
          <option value="DRAFT">Koncept</option>
          <option value="PUBLISHED">Publikováno</option>
          <option value="ARCHIVED">Archivováno</option>
        </select>
      </div>

      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)]">
        {pagesQuery.isLoading && (
          <p className="p-6 text-[var(--muted-foreground)]">Načítání stránek...</p>
        )}

        {pagesQuery.isError && (
          <p className="p-6 text-[var(--destructive)]">
            Nepodařilo se načíst stránky. Zkuste to prosím znovu.
          </p>
        )}

        {pagesQuery.isSuccess && (
          <>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="px-4 py-3 font-medium text-[var(--muted-foreground)]">Název</th>
                  <th className="px-4 py-3 font-medium text-[var(--muted-foreground)]">Slug</th>
                  <th className="px-4 py-3 font-medium text-[var(--muted-foreground)]">Stav</th>
                  <th className="px-4 py-3 font-medium text-[var(--muted-foreground)]">Aktualizováno</th>
                  <th className="px-4 py-3 font-medium text-[var(--muted-foreground)]">Akce</th>
                </tr>
              </thead>
              <tbody>
                {data && data.items.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-[var(--muted-foreground)]" colSpan={5}>
                      Žádné stránky.
                    </td>
                  </tr>
                ) : (
                  data?.items.map((p) => (
                    <tr key={p.id} className="border-b border-[var(--border)] last:border-b-0">
                      <td className="px-4 py-3 font-medium">
                        <Link
                          href={`/admin/stranky/${p.id}`}
                          className="text-[var(--primary)] hover:underline"
                        >
                          {p.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-[var(--muted-foreground)]">{p.slug}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[p.status] ?? ""}`}
                        >
                          {STATUS_LABELS[p.status] ?? p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[var(--muted-foreground)]">
                        {formatDate(p.updatedAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Link href={`/admin/stranky/${p.id}`}>
                            <Button variant="outline" size="sm">
                              Upravit
                            </Button>
                          </Link>
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={deleteMutation.isPending}
                            onClick={() => handleDelete(p.id, p.title)}
                          >
                            Smazat
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Pagination */}
            {data && data.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-[var(--border)] px-4 py-3">
                <p className="text-sm text-[var(--muted-foreground)]">
                  Stranka {data.page} z {data.totalPages} ({data.totalItems} stránek)
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Předchozí
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= data.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Další
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nová stránka</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Název</label>
              <Input
                value={newTitle}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Název stránky"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Slug</label>
              <Input
                value={newSlug}
                onChange={(e) => setNewSlug(e.target.value)}
                placeholder="url-stranky"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Zrušit
            </Button>
            <Button
              disabled={!newTitle.trim() || !newSlug.trim() || createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              Vytvořit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
