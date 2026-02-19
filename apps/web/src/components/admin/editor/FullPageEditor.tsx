"use client";

import { useState, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { pageAdminApi } from "@samofujera/api-client";
import type { SerializedEditorState } from "lexical";
import { EditorToolbar } from "./EditorToolbar";
import { SettingsDrawer } from "./SettingsDrawer";
import { SectionList, type SectionListHandle } from "./SectionList";
import type { SectionEditorHandle } from "./PageEditor";
import type { PageSection, SectionPageContent, TextBlock } from "./types";
import { createEmptySection, createTextBlock } from "./types";

/** Parse content into sections (with backward compat for old formats). */
function parseSections(content: Record<string, unknown> | null): PageSection[] {
  if (!content) {
    return [createEmptySection()];
  }
  // Version 3: block-based format
  if (content.version === 3 && Array.isArray(content.sections)) {
    return content.sections as PageSection[];
  }
  // Version 2: slot-based format → convert each slot to a text block
  if (content.version === 2 && Array.isArray(content.sections)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (content.sections as any[]).map((s) => ({
      id: s.id ?? crypto.randomUUID(),
      blocks: (s.slots ?? []).map((slot: { id?: string; content: SerializedEditorState | null }) => ({
        id: slot.id ?? crypto.randomUUID(),
        type: "text" as const,
        content: slot.content,
      } satisfies TextBlock)),
    }));
  }
  // Version 1: old section format (content directly on section, no slots)
  if (content.version === 1 && Array.isArray(content.sections)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (content.sections as any[]).map((s) => ({
      id: s.id ?? crypto.randomUUID(),
      blocks: [createTextBlock(s.content as SerializedEditorState | null)],
    }));
  }
  // Legacy format: single Lexical state, wrap in one section with one text block
  return [
    {
      id: crypto.randomUUID(),
      blocks: [createTextBlock(content as unknown as SerializedEditorState)],
    },
  ];
}

function serializeContent(sections: PageSection[]): SectionPageContent {
  return { version: 3, sections };
}

export function FullPageEditor() {
  const params = useParams();
  const queryClient = useQueryClient();
  const pageId = params?.pageId as string;

  // Page data
  const pageQuery = useQuery({
    queryKey: ["admin", "pages", pageId],
    queryFn: () => pageAdminApi.getPage(pageId),
    enabled: Boolean(pageId),
  });

  // State
  const [sections, setSections] = useState<PageSection[]>([]);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [focusedSectionIndex, setFocusedSectionIndex] = useState<number | null>(null);
  const [sectionListCanUndo, setSectionListCanUndo] = useState(false);
  const [sectionListCanRedo, setSectionListCanRedo] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Refs
  const sectionListRef = useRef<SectionListHandle>(null);
  const textEditorRefs = useRef<Map<string, SectionEditorHandle>>(new Map());

  // Initialize from query data
  const pageData = pageQuery.data?.data;
  if (pageData && !initialized) {
    setTitle(pageData.title);
    setSlug(pageData.slug);
    setMetaTitle(pageData.metaTitle ?? "");
    setMetaDescription(pageData.metaDescription ?? "");
    setSections(parseSections(pageData.content));
    setInitialized(true);
  }

  // Mutations
  const saveMutation = useMutation({
    mutationFn: () =>
      pageAdminApi.updatePage(pageId, {
        slug,
        title,
        content: serializeContent(sections) as unknown as Record<string, unknown>,
        metaTitle: metaTitle || null,
        metaDescription: metaDescription || null,
        ogImageId: null,
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["admin", "pages"] }),
  });

  const publishMutation = useMutation({
    mutationFn: () => pageAdminApi.publishPage(pageId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["admin", "pages"] }),
  });

  const unpublishMutation = useMutation({
    mutationFn: () => pageAdminApi.unpublishPage(pageId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["admin", "pages"] }),
  });

  const scheduleMutation = useMutation({
    mutationFn: (date: string) =>
      pageAdminApi.schedulePage(pageId, { scheduledPublishAt: date }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["admin", "pages"] }),
  });

  const cancelScheduleMutation = useMutation({
    mutationFn: () => pageAdminApi.cancelSchedule(pageId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["admin", "pages"] }),
  });

  // Handlers
  const handleSave = useCallback(() => {
    saveMutation.mutate();
  }, [saveMutation]);

  const handlePublish = useCallback(() => {
    saveMutation.mutate(undefined, {
      onSuccess: () => publishMutation.mutate(),
    });
  }, [saveMutation, publishMutation]);

  const handleUnpublish = useCallback(() => {
    unpublishMutation.mutate();
  }, [unpublishMutation]);

  const handleSchedule = useCallback(
    (date: string) => {
      saveMutation.mutate(undefined, {
        onSuccess: () => scheduleMutation.mutate(date),
      });
    },
    [saveMutation, scheduleMutation],
  );

  const handleCancelSchedule = useCallback(() => {
    cancelScheduleMutation.mutate();
  }, [cancelScheduleMutation]);

  const handleSectionListUndoRedoChange = useCallback(
    (listCanUndo: boolean, listCanRedo: boolean) => {
      setSectionListCanUndo(listCanUndo);
      setSectionListCanRedo(listCanRedo);
    },
    [],
  );

  // Undo/Redo — dispatch to focused section's text blocks or section-level
  const handleUndo = useCallback(() => {
    if (focusedSectionIndex !== null) {
      const section = sections[focusedSectionIndex];
      if (section) {
        for (const block of section.blocks) {
          if (block.type === "text") {
            const editorHandle = textEditorRefs.current.get(block.id);
            if (editorHandle?.canUndo) {
              editorHandle.undo();
              return;
            }
          }
        }
      }
    }
    sectionListRef.current?.undo();
  }, [focusedSectionIndex, sections]);

  const handleRedo = useCallback(() => {
    if (focusedSectionIndex !== null) {
      const section = sections[focusedSectionIndex];
      if (section) {
        for (const block of section.blocks) {
          if (block.type === "text") {
            const editorHandle = textEditorRefs.current.get(block.id);
            if (editorHandle?.canRedo) {
              editorHandle.redo();
              return;
            }
          }
        }
      }
    }
    sectionListRef.current?.redo();
  }, [focusedSectionIndex, sections]);

  // Loading state
  if (!initialized) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
        <p className="text-[var(--muted-foreground)]">
          Načítání editoru...
        </p>
      </div>
    );
  }

  const status = pageData?.status ?? "DRAFT";
  const scheduledPublishAt = pageData?.scheduledPublishAt ?? null;

  return (
    <>
      {/* Full-screen overlay */}
      <div className="fixed inset-0 z-50 flex flex-col bg-white">
        {/* Toolbar */}
        <EditorToolbar
          title={title}
          onTitleChange={setTitle}
          status={status}
          scheduledPublishAt={scheduledPublishAt}
          onSave={handleSave}
          onPublish={handlePublish}
          onUnpublish={handleUnpublish}
          onSchedule={handleSchedule}
          onCancelSchedule={handleCancelSchedule}
          onUndo={handleUndo}
          onRedo={handleRedo}
          canUndo={canUndo || sectionListCanUndo}
          canRedo={canRedo || sectionListCanRedo}
          isSaving={saveMutation.isPending}
          onSettingsToggle={() => setShowSettings(!showSettings)}
        />

        {/* Editor content area — scrollable, mimics public page */}
        <div
          className="flex-1 overflow-y-auto overflow-x-hidden bg-repeat pt-12"
          style={{ backgroundImage: "url('/images/bg-body-texture.png')" }}
        >
          <div className="pt-8 pb-12">
            <SectionList
              ref={sectionListRef}
              sections={sections}
              onSectionsChange={setSections}
              onUndoRedoChange={handleSectionListUndoRedoChange}
              onFocusedSectionChange={setFocusedSectionIndex}
              textEditorRefs={textEditorRefs}
            />
          </div>
        </div>
      </div>

      {/* Settings drawer */}
      <SettingsDrawer
        open={showSettings}
        onOpenChange={setShowSettings}
        slug={slug}
        onSlugChange={setSlug}
        metaTitle={metaTitle}
        onMetaTitleChange={setMetaTitle}
        metaDescription={metaDescription}
        onMetaDescriptionChange={setMetaDescription}
      />
    </>
  );
}
