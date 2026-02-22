"use client";

import {
  Input,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  Switch,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@samofujera/ui";
import { useQuery } from "@tanstack/react-query";
import { mediaApi } from "@samofujera/api-client";
import { MediaPicker } from "../media/MediaPicker";

interface SettingsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Obecné tab
  title: string;
  slug: string;
  onSlugChange: (slug: string) => void;
  showInNav: boolean;
  onShowInNavChange: (showInNav: boolean) => void;
  // SEO tab — Meta
  metaTitle: string;
  onMetaTitleChange: (title: string) => void;
  metaDescription: string;
  onMetaDescriptionChange: (desc: string) => void;
  metaKeywords: string;
  onMetaKeywordsChange: (keywords: string) => void;
  // SEO tab — OG
  ogTitle: string;
  onOgTitleChange: (title: string) => void;
  ogDescription: string;
  onOgDescriptionChange: (desc: string) => void;
  ogImageId: string | null;
  onOgImageIdChange: (id: string | null) => void;
  // SEO tab — Robots
  noindex: boolean;
  onNoindexChange: (noindex: boolean) => void;
  nofollow: boolean;
  onNofollowChange: (nofollow: boolean) => void;
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
  const displayUrl = `samofujera.cz/${slug}`;
  const displayDesc = metaDescription || "Popis není nastaven";
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

function SocialPreview({
  title,
  metaTitle,
  metaDescription,
  ogTitle,
  ogDescription,
  ogImageId,
}: {
  title: string;
  metaTitle: string;
  metaDescription: string;
  ogTitle: string;
  ogDescription: string;
  ogImageId: string | null;
}) {
  const effectiveTitle = ogTitle || metaTitle || title || "Samo Fujera";
  const effectiveDesc = ogDescription || metaDescription || "";

  const imageQuery = useQuery({
    queryKey: ["media", "item", ogImageId],
    queryFn: () => mediaApi.getItem(ogImageId!),
    enabled: Boolean(ogImageId),
  });

  const imageUrl = imageQuery.data?.data?.originalUrl;

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--border)]">
      <div className="flex h-[158px] items-center justify-center bg-[var(--muted)] overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt="OG preview"
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-xs text-[var(--muted-foreground)]">
            1200 × 630
          </span>
        )}
      </div>
      <div className="border-t border-[var(--border)] bg-[#f2f3f5] p-3">
        <p className="text-[10px] uppercase text-[#606770]">samofujera.cz</p>
        <p className="mt-0.5 truncate text-sm font-semibold text-[#1d2129]">
          {effectiveTitle}
        </p>
        {effectiveDesc && (
          <p className="mt-0.5 line-clamp-2 text-xs text-[#606770]">
            {effectiveDesc}
          </p>
        )}
      </div>
    </div>
  );
}

export function SettingsDrawer({
  open,
  onOpenChange,
  title,
  slug,
  onSlugChange,
  showInNav,
  onShowInNavChange,
  metaTitle,
  onMetaTitleChange,
  metaDescription,
  onMetaDescriptionChange,
  metaKeywords,
  onMetaKeywordsChange,
  ogTitle,
  onOgTitleChange,
  ogDescription,
  onOgDescriptionChange,
  ogImageId,
  onOgImageIdChange,
  noindex,
  onNoindexChange,
  nofollow,
  onNofollowChange,
}: SettingsDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[400px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Nastavení stránky</SheetTitle>
        </SheetHeader>
        <Tabs defaultValue="obecne" className="mt-4">
          <TabsList className="w-full">
            <TabsTrigger value="obecne" className="flex-1">
              Obecné
            </TabsTrigger>
            <TabsTrigger value="seo" className="flex-1">
              SEO
            </TabsTrigger>
          </TabsList>

          {/* ── Obecné tab ── */}
          <TabsContent value="obecne" className="space-y-6 pt-4">
            {/* URL adresa */}
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                URL adresa
              </label>
              <div className="flex items-center gap-1">
                <span className="text-sm text-[var(--muted-foreground)]">
                  /
                </span>
                <Input
                  value={slug}
                  onChange={(e) => onSlugChange(e.target.value)}
                  placeholder="url-stranky"
                />
              </div>
            </div>

            {/* Titulek stránky (read-only) */}
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Titulek stránky
              </label>
              <p className="text-sm text-[var(--muted-foreground)]">
                {title || "–"}
              </p>
            </div>

            {/* Nezobrazovat v navigaci */}
            <label className="flex items-center justify-between text-sm">
              <span>Nezobrazovat v navigaci</span>
              <Switch
                checked={!showInNav}
                onCheckedChange={(checked) => onShowInNavChange(!checked)}
              />
            </label>
          </TabsContent>

          {/* ── SEO tab ── */}
          <TabsContent value="seo" className="space-y-6 pt-4">
            {/* Google preview */}
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Náhled ve vyhledávači
              </label>
              <GooglePreview
                title={title}
                slug={slug}
                metaTitle={metaTitle}
                metaDescription={metaDescription}
              />
            </div>

            {/* Meta titulek */}
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Meta titulek
              </label>
              <Input
                value={metaTitle}
                onChange={(e) => onMetaTitleChange(e.target.value)}
                placeholder="Titulek pro vyhledávače"
              />
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                {metaTitle.length}/200
              </p>
            </div>

            {/* Meta popis */}
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Meta popis
              </label>
              <textarea
                value={metaDescription}
                onChange={(e) => onMetaDescriptionChange(e.target.value)}
                placeholder="Krátký popis pro vyhledávače"
                rows={3}
                className="flex w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
              />
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                {metaDescription.length}/500
              </p>
            </div>

            {/* Klíčová slova */}
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Klíčová slova
              </label>
              <Input
                value={metaKeywords}
                onChange={(e) => onMetaKeywordsChange(e.target.value)}
                placeholder="klíč1, klíč2, klíč3"
              />
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                {metaKeywords.length}/300
              </p>
            </div>

            {/* OG titulek */}
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                OG titulek
              </label>
              <Input
                value={ogTitle}
                onChange={(e) => onOgTitleChange(e.target.value)}
                placeholder="Automaticky z meta titulku"
              />
            </div>

            {/* OG popis */}
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                OG popis
              </label>
              <textarea
                value={ogDescription}
                onChange={(e) => onOgDescriptionChange(e.target.value)}
                placeholder="Automaticky z meta popisu"
                rows={2}
                className="flex w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
              />
            </div>

            {/* OG obrázek */}
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                OG obrázek
              </label>
              <MediaPicker
                value={ogImageId}
                onChange={onOgImageIdChange}
                accept="image/*"
              />
            </div>

            {/* Social preview */}
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Náhled sociální karty
              </label>
              <SocialPreview
                title={title}
                metaTitle={metaTitle}
                metaDescription={metaDescription}
                ogTitle={ogTitle}
                ogDescription={ogDescription}
                ogImageId={ogImageId}
              />
            </div>

            {/* Pokročilé — Robots */}
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Pokročilé
              </label>
              <div className="space-y-3">
                <label className="flex items-center justify-between text-sm">
                  <span>noindex — nezobrazovat ve vyhledávačích</span>
                  <Switch
                    checked={noindex}
                    onCheckedChange={onNoindexChange}
                  />
                </label>
                <label className="flex items-center justify-between text-sm">
                  <span>nofollow — nesledovat odkazy na stránce</span>
                  <Switch
                    checked={nofollow}
                    onCheckedChange={onNofollowChange}
                  />
                </label>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
