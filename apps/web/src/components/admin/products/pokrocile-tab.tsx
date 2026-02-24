"use client";

import { useState } from "react";
import { t } from "@lingui/core/macro";
import type { UseFormReturn } from "react-hook-form";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Input,
  Textarea,
} from "@samofujera/ui";
import { ImagePicker } from "../images/ImagePicker";
import type { ImagePickerResult } from "../images/ImagePicker";

interface PokrocileTabProps {
  form: UseFormReturn<any>;
  disabled: boolean;
  slug: string;
}

function GooglePreview({
  title,
  slug,
  metaTitle,
  metaDescription,
}: {
  title: string;
  slug: string;
  metaTitle: string;
  metaDescription: string;
}) {
  const displayTitle =
    metaTitle || (title ? `${title} | Samo Fujera` : "Samo Fujera");
  const displayUrl = `samofujera.cz/produkty/${slug}`;
  const displayDesc = metaDescription || t`Popis neni nastaven`;
  const truncTitle =
    displayTitle.length > 60
      ? displayTitle.slice(0, 57) + "..."
      : displayTitle;
  const truncDesc =
    displayDesc.length > 160
      ? displayDesc.slice(0, 157) + "..."
      : displayDesc;

  return (
    <div className="rounded-lg border border-[var(--border)] bg-white p-4">
      <p className="truncate text-sm font-medium text-[#1a0dab]">
        {truncTitle}
      </p>
      <p className="text-xs text-[#006621]">{displayUrl}</p>
      <p
        className={`mt-1 line-clamp-2 text-xs ${
          metaDescription
            ? "text-[#545454]"
            : "italic text-[var(--muted-foreground)]"
        }`}
      >
        {truncDesc}
      </p>
    </div>
  );
}

export function PokrocileTab({ form, disabled, slug }: PokrocileTabProps) {
  const [ogPickerOpen, setOgPickerOpen] = useState(false);

  const metaTitle = form.watch("metaTitle") ?? "";
  const metaDescription = form.watch("metaDescription") ?? "";
  const title = form.watch("title") ?? "";
  const ogImageUrl = form.watch("ogImageUrl") ?? "";

  function handleOgImageSelect(result: ImagePickerResult) {
    form.setValue("ogImageUrl", result.imageId, { shouldDirty: true });
    setOgPickerOpen(false);
  }

  return (
    <div className="space-y-6">
      <h3 className="mb-4 text-sm font-semibold">{t`SEO nastaveni stranky`}</h3>

      {/* Row: Titulek stranky + URL identifikator */}
      <div className="flex gap-4">
        <FormField
          control={form.control}
          name="metaTitle"
          render={({ field }) => (
            <FormItem className="flex-1">
              <FormLabel>{t`Titulek stranky`}</FormLabel>
              <FormControl>
                <Input {...field} disabled={disabled} maxLength={255} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormItem className="flex-1">
          <FormLabel>{t`URL identifikator stranky`}</FormLabel>
          <FormControl>
            <Input value={slug} readOnly disabled className="bg-[var(--muted)]" />
          </FormControl>
        </FormItem>
      </div>

      {/* Row: Popisek stranky + Klicova slova */}
      <div className="flex gap-4">
        <FormField
          control={form.control}
          name="metaDescription"
          render={({ field }) => (
            <FormItem className="flex-1">
              <FormLabel>{t`Popisek stranky`}</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  disabled={disabled}
                  rows={3}
                  maxLength={500}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="metaKeywords"
          render={({ field }) => (
            <FormItem className="flex-1">
              <FormLabel>{t`Klicova slova`}</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  disabled={disabled}
                  rows={3}
                  maxLength={300}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* OG obrazek */}
      <div>
        <label className="mb-1.5 block text-sm font-medium">
          {t`OG obrazek`}
        </label>
        {ogImageUrl ? (
          <div className="flex items-center gap-3">
            <img
              src={ogImageUrl}
              alt="OG preview"
              className="h-16 w-28 rounded border border-[var(--border)] object-cover"
            />
            <div className="flex gap-2">
              <button
                type="button"
                className="text-xs text-[var(--primary)] hover:underline"
                onClick={() => setOgPickerOpen(true)}
                disabled={disabled}
              >
                {t`Zmenit`}
              </button>
              <button
                type="button"
                className="text-xs text-[var(--destructive)] hover:underline"
                onClick={() =>
                  form.setValue("ogImageUrl", "", { shouldDirty: true })
                }
                disabled={disabled}
              >
                {t`Odebrat`}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm hover:bg-[var(--accent)]"
            onClick={() => setOgPickerOpen(true)}
            disabled={disabled}
          >
            {t`Vybrat obrazek`}
          </button>
        )}
        <ImagePicker
          open={ogPickerOpen}
          onOpenChange={setOgPickerOpen}
          onSelect={handleOgImageSelect}
          targetAspectRatio={1.91}
        />
      </div>

      {/* Nahled ve vyhledavaci */}
      <div>
        <label className="mb-1.5 block text-sm font-medium">
          {t`Nahled ve vyhledavaci`}
        </label>
        <GooglePreview
          title={title}
          slug={slug}
          metaTitle={metaTitle}
          metaDescription={metaDescription}
        />
      </div>
    </div>
  );
}
