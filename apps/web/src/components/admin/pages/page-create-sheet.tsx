"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { t } from "@lingui/core/macro";
import { Loader2 } from "lucide-react";
import { pageAdminApi } from "@samofujera/api-client";
import {
  Button,
  Input,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@samofujera/ui";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

interface PageCreateSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PageCreateSheet({ open, onOpenChange }: PageCreateSheetProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  const createMutation = useMutation({
    mutationFn: async () => {
      const finalSlug = slug || slugify(title);
      const response = await pageAdminApi.createPage({
        slug: finalSlug,
        title,
      });
      // Set default section content: heading + body text
      const defaultContent = {
        version: 3,
        sections: [
          {
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
                        children: [
                          {
                            type: "text",
                            text: title,
                            format: 1,
                            mode: "normal",
                            style: "",
                            detail: 0,
                            version: 1,
                          },
                        ],
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
                        children: [
                          {
                            type: "text",
                            text: "Vas text zacina prave zde. Kliknete a muzete zacit psat.",
                            format: 0,
                            mode: "normal",
                            style: "",
                            detail: 0,
                            version: 1,
                          },
                        ],
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
          },
        ],
      };
      await pageAdminApi.updatePage(response.data.id, {
        slug: finalSlug,
        title,
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
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "pages"] });
      onOpenChange(false);
      resetForm();
      router.push(`/admin/stranky/${response.data.id}/edit`);
    },
  });

  function resetForm() {
    setTitle("");
    setSlug("");
    setSlugManuallyEdited(false);
  }

  function handleTitleChange(value: string) {
    setTitle(value);
    if (!slugManuallyEdited) {
      setSlug(slugify(value));
    }
  }

  function handleSlugChange(value: string) {
    setSlug(value);
    setSlugManuallyEdited(true);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      resetForm();
    }
    onOpenChange(nextOpen);
  }

  const canSubmit = title.trim().length > 0 && !createMutation.isPending;

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{t`Nova stranka`}</SheetTitle>
          <SheetDescription>
            {t`Zadejte nazev a slug nove stranky. Po vytvoreni budete presmerovani do editoru.`}
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-4 px-4 py-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="page-title" className="text-sm font-medium">
              {t`Nazev`}
            </label>
            <Input
              id="page-title"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder={t`Zadejte nazev stranky`}
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="page-slug" className="text-sm font-medium">
              {t`Slug`}
            </label>
            <Input
              id="page-slug"
              value={slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              placeholder={t`url-adresa-stranky`}
            />
            <p className="text-xs text-muted-foreground">
              {t`Automaticky generovano z nazvu. Muzete upravit rucne.`}
            </p>
          </div>
        </div>
        <SheetFooter>
          <Button
            disabled={!canSubmit}
            onClick={() => createMutation.mutate()}
          >
            {createMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {t`Vytvorit`}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
