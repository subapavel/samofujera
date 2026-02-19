"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useParams } from "next/navigation";
import { pageAdminApi } from "@samofujera/api-client";
import type { SerializedEditorState } from "lexical";
import {
  Button,
  Input,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@samofujera/ui";
import { PageEditor } from "../editor/PageEditor";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function PageEditorPage() {
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const pageId = params?.pageId as string | undefined;
  const isNew = !pageId;

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [showSeoDialog, setShowSeoDialog] = useState(false);

  // Track editor content separately via ref (avoids re-renders on every keystroke)
  const contentRef = useRef<SerializedEditorState | null>(null);

  // Track whether we've initialized the form from query data
  const [formReady, setFormReady] = useState(isNew);

  const pageQuery = useQuery({
    queryKey: ["admin", "pages", pageId],
    queryFn: () => pageAdminApi.getPage(pageId!),
    enabled: Boolean(pageId),
  });

  // Derive initial content from query — only used once for PageEditor mount
  const initialContent = pageQuery.data?.data?.content as SerializedEditorState | null ?? null;

  // Populate form fields once query succeeds
  useEffect(() => {
    if (pageQuery.data && !formReady) {
      const page = pageQuery.data.data;
      setTitle(page.title);
      setSlug(page.slug);
      setMetaTitle(page.metaTitle ?? "");
      setMetaDescription(page.metaDescription ?? "");
      contentRef.current = initialContent;
      setFormReady(true);
    }
  }, [pageQuery.data, formReady, initialContent]);

  const saveMutation = useMutation({
    mutationFn: () =>
      pageAdminApi.updatePage(pageId!, {
        slug,
        title,
        content: contentRef.current as unknown as Record<string, unknown> | null,
        metaTitle: metaTitle || null,
        metaDescription: metaDescription || null,
        ogImageId: null,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "pages"] });
    },
  });

  const publishMutation = useMutation({
    mutationFn: () => pageAdminApi.publishPage(pageId!),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "pages"] });
    },
  });

  const unpublishMutation = useMutation({
    mutationFn: () => pageAdminApi.unpublishPage(pageId!),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "pages"] });
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const response = await pageAdminApi.createPage({
        slug: slug || slugify(title),
        title,
      });
      // Immediately save content if any was entered
      if (contentRef.current) {
        await pageAdminApi.updatePage(response.data.id, {
          slug: slug || slugify(title),
          title,
          content: contentRef.current as unknown as Record<string, unknown>,
          metaTitle: metaTitle || null,
          metaDescription: metaDescription || null,
          ogImageId: null,
        });
      }
      return response;
    },
    onSuccess: (response) => {
      router.replace(`/admin/stranky/${response.data.id}`);
    },
  });

  const handleContentChange = useCallback((state: SerializedEditorState) => {
    contentRef.current = state;
  }, []);

  function handleSave() {
    if (isNew) {
      createMutation.mutate();
    } else {
      saveMutation.mutate();
    }
  }

  function handlePublish() {
    if (!isNew) {
      saveMutation.mutate(undefined, {
        onSuccess: () => {
          publishMutation.mutate();
        },
      });
    }
  }

  function handleUnpublish() {
    if (!isNew) {
      unpublishMutation.mutate();
    }
  }

  const pageData = pageQuery.data?.data;
  const status = pageData?.status ?? "DRAFT";
  const isSaving = saveMutation.isPending || createMutation.isPending;

  if (pageId && pageQuery.isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-[var(--muted-foreground)]">Načítání stránky...</p>
      </div>
    );
  }

  if (pageId && pageQuery.isError) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-[var(--destructive)]">Stránka nenalezena.</p>
      </div>
    );
  }

  // Don't render the editor until form is populated from query data
  if (!formReady) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-[var(--muted-foreground)]">Načítání stránky...</p>
      </div>
    );
  }

  return (
    <div className="-m-6 flex flex-col">
      {/* Top bar */}
      <div className="flex items-center gap-3 border-b border-[var(--border)] bg-[var(--card)] px-4 py-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/admin/stranky")}
        >
          &larr; Zpět
        </Button>

        <Input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (isNew) setSlug(slugify(e.target.value));
          }}
          placeholder="Název stránky"
          className="max-w-sm font-semibold"
        />

        <span className="text-sm text-[var(--muted-foreground)]">/pages/</span>
        <Input
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="slug"
          className="max-w-[200px]"
        />

        <div className="flex-1" />

        {/* Status badge */}
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            status === "PUBLISHED"
              ? "bg-green-100 text-green-700"
              : "bg-gray-100 text-gray-700"
          }`}
        >
          {status === "PUBLISHED" ? "Publikováno" : "Koncept"}
        </span>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowSeoDialog(true)}
        >
          SEO
        </Button>

        <Button
          variant="outline"
          size="sm"
          disabled={isSaving || !title.trim()}
          onClick={handleSave}
        >
          {isSaving ? "Ukládání..." : "Uložit"}
        </Button>

        {!isNew && status !== "PUBLISHED" && (
          <Button
            size="sm"
            disabled={publishMutation.isPending || !title.trim()}
            onClick={handlePublish}
          >
            Publikovat
          </Button>
        )}

        {!isNew && status === "PUBLISHED" && (
          <Button
            variant="outline"
            size="sm"
            disabled={unpublishMutation.isPending}
            onClick={handleUnpublish}
          >
            Zrušit publikaci
          </Button>
        )}
      </div>

      {/* Editor area */}
      <div className="flex-1">
        <PageEditor
          key={pageId ?? "new"}
          initialContent={initialContent}
          onChange={handleContentChange}
        />
      </div>

      {/* SEO Dialog */}
      <Dialog open={showSeoDialog} onOpenChange={setShowSeoDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>SEO nastavení</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Meta titulek</label>
              <Input
                value={metaTitle}
                onChange={(e) => setMetaTitle(e.target.value)}
                placeholder="Titulek stránky pro vyhledávače"
              />
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                {metaTitle.length}/200 znaků
              </p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Meta popis</label>
              <textarea
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
                placeholder="Krátký popis stránky pro vyhledávače"
                rows={3}
                className="flex w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
              />
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                {metaDescription.length}/500 znaků
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowSeoDialog(false)}>Hotovo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
