"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText } from "lucide-react";
import { t } from "@lingui/core/macro";
import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import type { MessageDescriptor } from "@lingui/core";
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

const STATUS_LABELS: Record<string, MessageDescriptor> = {
  DRAFT: msg`Koncept`,
  PUBLISHED: msg`Publikováno`,
  ARCHIVED: msg`Archivováno`,
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
  const { _ } = useLingui();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [step, setStep] = useState<"template" | "title">("template");

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
    mutationFn: async () => {
      const response = await pageAdminApi.createPage({
        slug: newSlug || slugify(newTitle),
        title: newTitle,
      });
      // Set default section content: two text blocks (heading + body text)
      const defaultContent = {
        version: 3,
        sections: [{
          id: crypto.randomUUID(),
          blocks: [
            {
              id: crypto.randomUUID(),
              type: "text",
              content: {
                root: {
                  children: [
                    {
                      type: "heading",
                      tag: "h1",
                      children: [{ type: "text", text: newTitle, format: 1, mode: "normal", style: "", detail: 0, version: 1 }],
                      direction: "ltr",
                      format: "",
                      indent: 0,
                      version: 1,
                    },
                  ],
                  direction: "ltr",
                  format: "",
                  indent: 0,
                  type: "root",
                  version: 1,
                },
              },
            },
            {
              id: crypto.randomUUID(),
              type: "text",
              content: {
                root: {
                  children: [
                    {
                      type: "paragraph",
                      children: [{ type: "text", text: "Váš text začíná právě zde. Klikněte a můžete začít psát. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium totam rem aperiam eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo nemo enim ipsam voluptatem.", format: 0, mode: "normal", style: "", detail: 0, version: 1 }],
                      direction: "ltr",
                      format: "",
                      indent: 0,
                      version: 1,
                    },
                  ],
                  direction: "ltr",
                  format: "",
                  indent: 0,
                  type: "root",
                  version: 1,
                },
              },
            },
          ],
        }],
      };
      await pageAdminApi.updatePage(response.data.id, {
        slug: newSlug || slugify(newTitle),
        title: newTitle,
        content: defaultContent as unknown as Record<string, unknown>,
        metaTitle: null,
        metaDescription: null,
        ogImageId: null,
        showInNav: false,
        metaKeywords: null,
        ogTitle: null,
        ogDescription: null,
        noindex: false,
        nofollow: false,
      });
      return response;
    },
    onSuccess: (response) => {
      setShowCreateDialog(false);
      setNewTitle("");
      setNewSlug("");
      setStep("template");
      router.push(`/admin/stranky/${response.data.id}/edit`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => pageAdminApi.deletePage(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "pages"] });
    },
  });

  function handleDelete(id: string, title: string) {
    if (window.confirm(t`Opravdu chcete smazat stránku "${title}"?`)) {
      deleteMutation.mutate(id);
    }
  }

  function handleTitleChange(value: string) {
    setNewTitle(value);
    setNewSlug(slugify(value));
  }

  function handleOpenCreateDialog() {
    setStep("template");
    setNewTitle("");
    setNewSlug("");
    setShowCreateDialog(true);
  }

  const data = pagesQuery.data?.data;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold">{t`Stránky`}</h2>
        <Button onClick={handleOpenCreateDialog}>{t`Nová stránka`}</Button>
      </div>

      {/* Filters */}
      <div className="mb-4 flex gap-3">
        <Input
          placeholder={t`Hledat...`}
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
          <option value="">{t`Všechny stavy`}</option>
          <option value="DRAFT">{t`Koncept`}</option>
          <option value="PUBLISHED">{t`Publikováno`}</option>
          <option value="ARCHIVED">{t`Archivováno`}</option>
        </select>
      </div>

      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)]">
        {pagesQuery.isLoading && (
          <p className="p-6 text-[var(--muted-foreground)]">{t`Načítání stránek...`}</p>
        )}

        {pagesQuery.isError && (
          <p className="p-6 text-[var(--destructive)]">
            {t`Nepodařilo se načíst stránky. Zkuste to prosím znovu.`}
          </p>
        )}

        {pagesQuery.isSuccess && (
          <>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="px-4 py-3 font-medium text-[var(--muted-foreground)]">{t`Název`}</th>
                  <th className="px-4 py-3 font-medium text-[var(--muted-foreground)]">{t`Slug`}</th>
                  <th className="px-4 py-3 font-medium text-[var(--muted-foreground)]">{t`Stav`}</th>
                  <th className="px-4 py-3 font-medium text-[var(--muted-foreground)]">{t`Aktualizováno`}</th>
                  <th className="px-4 py-3 font-medium text-[var(--muted-foreground)]">{t`Akce`}</th>
                </tr>
              </thead>
              <tbody>
                {data && data.items.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-[var(--muted-foreground)]" colSpan={5}>
                      {t`Žádné stránky.`}
                    </td>
                  </tr>
                ) : (
                  data?.items.map((p) => (
                    <tr key={p.id} className="border-b border-[var(--border)] last:border-b-0">
                      <td className="px-4 py-3 font-medium">
                        <Link
                          href={`/admin/stranky/${p.id}/edit`}
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
                          {_(STATUS_LABELS[p.status]) ?? p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[var(--muted-foreground)]">
                        {formatDate(p.updatedAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Link href={`/admin/stranky/${p.id}/edit`}>
                            <Button variant="outline" size="sm">
                              {t`Upravit`}
                            </Button>
                          </Link>
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={deleteMutation.isPending}
                            onClick={() => handleDelete(p.id, p.title)}
                          >
                            {t`Smazat`}
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
                  {t`Stránka ${data.page} z ${data.totalPages} (${data.totalItems} stránek)`}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    {t`Předchozí`}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= data.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    {t`Další`}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        {step === "template" ? (
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{t`Nová stránka`}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <button
                type="button"
                className="flex flex-col items-center gap-3 rounded-xl border-2 border-[var(--border)] p-6 transition-colors hover:border-[rgb(6,93,77)] hover:bg-[rgb(6,93,77)]/5"
                onClick={() => setStep("title")}
              >
                <FileText className="h-10 w-10 text-[var(--muted-foreground)]" />
                <span className="font-medium">{t`Prázdná stránka`}</span>
              </button>
            </div>
          </DialogContent>
        ) : (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t`Název stránky`}</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <Input
                value={newTitle}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder={t`Zadejte název stránky`}
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("template")}>
                {t`Zpět`}
              </Button>
              <Button
                disabled={!newTitle.trim() || createMutation.isPending}
                onClick={() => createMutation.mutate()}
              >
                {t`Vytvořit`}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
