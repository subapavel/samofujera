"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { t } from "@lingui/core/macro";
import { pageAdminApi } from "@samofujera/api-client";
import {
  Button,
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@samofujera/ui";

const dateFormatter = new Intl.DateTimeFormat("cs", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

interface RevisionListProps {
  pageId: string;
}

export function RevisionList({ pageId }: RevisionListProps) {
  const queryClient = useQueryClient();
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const revisionsQuery = useQuery({
    queryKey: ["admin", "pages", pageId, "revisions"],
    queryFn: () => pageAdminApi.getRevisions(pageId),
    enabled: Boolean(pageId),
  });

  const restoreMutation = useMutation({
    mutationFn: (revisionId: string) =>
      pageAdminApi.restoreRevision(pageId, revisionId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["admin", "pages", pageId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["admin", "pages", pageId, "revisions"],
      });
      setRestoringId(null);
    },
    onError: () => {
      setRestoringId(null);
    },
  });

  const revisions = revisionsQuery.data?.data ?? [];

  if (revisionsQuery.isLoading) {
    return (
      <p className="text-sm text-[var(--muted-foreground)]">
        {t`Načítání...`}
      </p>
    );
  }

  if (revisions.length === 0) {
    return (
      <p className="text-sm text-[var(--muted-foreground)]">
        {t`Žádné předchozí verze`}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {revisions.map((rev) => (
        <div
          key={rev.id}
          className="flex items-center justify-between rounded-md border border-[var(--border)] px-3 py-2"
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">
              {t`Verze`} {rev.version}
            </p>
            <p className="truncate text-xs text-[var(--muted-foreground)]">
              {rev.title}
            </p>
            <p className="text-xs text-[var(--muted-foreground)]">
              {dateFormatter.format(new Date(rev.createdAt))}
            </p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="ml-2 shrink-0"
                disabled={restoreMutation.isPending}
              >
                {t`Obnovit`}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {t`Obnovit verzi ${rev.version}?`}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {t`Aktuální obsah stránky bude nahrazen obsahem z této verze. Tuto akci nelze vrátit zpět.`}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t`Zrušit`}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    setRestoringId(rev.id);
                    restoreMutation.mutate(rev.id);
                  }}
                  disabled={restoreMutation.isPending}
                >
                  {restoringId === rev.id
                    ? t`Obnovuji...`
                    : t`Obnovit`}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      ))}
    </div>
  );
}
