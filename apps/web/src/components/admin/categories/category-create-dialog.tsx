"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { t } from "@lingui/core/macro";
import { Loader2 } from "lucide-react";
import { adminApi } from "@samofujera/api-client";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Textarea,
} from "@samofujera/ui";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

interface CategoryCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CategoryCreateDialog({
  open,
  onOpenChange,
}: CategoryCreateDialogProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [description, setDescription] = useState("");

  const createMutation = useMutation({
    mutationFn: () =>
      adminApi.createCategory({
        name: name.trim(),
        slug: slug.trim() || slugify(name),
        description: description.trim() || undefined,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "categories"] });
      handleClose();
    },
  });

  function handleClose() {
    onOpenChange(false);
    setName("");
    setSlug("");
    setSlugManuallyEdited(false);
    setDescription("");
  }

  function handleNameChange(value: string) {
    setName(value);
    if (!slugManuallyEdited) {
      setSlug(slugify(value));
    }
  }

  function handleSlugChange(value: string) {
    setSlugManuallyEdited(true);
    setSlug(value);
  }

  const isValid = name.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t`Nova kategorie`}</DialogTitle>
          <DialogDescription>
            {t`Vytvorte novou kategorii produktu.`}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="category-name">{t`Nazev`}</Label>
            <Input
              id="category-name"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder={t`Zadejte nazev kategorie`}
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="category-slug">{t`Slug`}</Label>
            <Input
              id="category-slug"
              value={slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              placeholder={t`automaticky-z-nazvu`}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="category-description">{t`Popis`}</Label>
            <Textarea
              id="category-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t`Volitelny popis kategorie`}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {t`Zrusit`}
          </Button>
          <Button
            disabled={!isValid || createMutation.isPending}
            onClick={() => createMutation.mutate()}
          >
            {createMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {t`Vytvorit`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
