"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { t } from "@lingui/core/macro";
import { Loader2 } from "lucide-react";
import { adminApi } from "@samofujera/api-client";
import type { EmailTemplateListItem } from "@samofujera/api-client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input,
  Label,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
} from "@samofujera/ui";

interface EditEmailTemplateDialogProps {
  template: EmailTemplateListItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

type Locale = "cs" | "sk";

interface LocaleState {
  customSubject: string;
  customBodyHtml: string;
}

export function EditEmailTemplateDialog({
  template,
  open,
  onOpenChange,
  onSaved,
}: EditEmailTemplateDialogProps) {
  const queryClient = useQueryClient();
  const [activeLocale, setActiveLocale] = useState<Locale>("cs");
  const [localeState, setLocaleState] = useState<Record<Locale, LocaleState>>({
    cs: { customSubject: "", customBodyHtml: "" },
    sk: { customSubject: "", customBodyHtml: "" },
  });

  // Load default subjects
  const defaultSubjectsQuery = useQuery({
    queryKey: ["admin", "email-templates", template.key, "default-subject"],
    queryFn: () => adminApi.getEmailDefaultSubjects(template.key),
    enabled: open,
  });

  // Load preview for active locale
  const previewQuery = useQuery({
    queryKey: [
      "admin",
      "email-templates",
      template.key,
      "preview",
      activeLocale,
    ],
    queryFn: () => adminApi.getEmailTemplatePreview(template.key, activeLocale),
    enabled: open,
  });

  const saveMutation = useMutation({
    mutationFn: (params: { locale: Locale; subject: string; body: string }) =>
      adminApi.updateEmailOverride(template.key, {
        locale: params.locale,
        customSubject: params.subject || null,
        customBodyHtml: params.body || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "email-templates"] });
      onSaved();
      onOpenChange(false);
    },
  });

  const resetMutation = useMutation({
    mutationFn: (locale: Locale) =>
      adminApi.deleteEmailOverride(template.key, locale),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "email-templates"] });
      onSaved();
      onOpenChange(false);
    },
  });

  function handleSave() {
    const state = localeState[activeLocale];
    saveMutation.mutate({
      locale: activeLocale,
      subject: state.customSubject,
      body: state.customBodyHtml,
    });
  }

  function handleReset() {
    resetMutation.mutate(activeLocale);
  }

  const defaultSubjects = defaultSubjectsQuery.data;
  const csPlaceholder = defaultSubjects?.cs ?? t`Výchozí předmět...`;
  const skPlaceholder = defaultSubjects?.sk ?? t`Výchozí predmet...`;
  const subjectPlaceholder =
    activeLocale === "cs" ? csPlaceholder : skPlaceholder;

  void subjectPlaceholder;

  const isBusy = saveMutation.isPending || resetMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{template.nameCzech}</DialogTitle>
        </DialogHeader>

        <Tabs
          value={activeLocale}
          onValueChange={(v) => setActiveLocale(v as Locale)}
          className="flex-1 flex flex-col min-h-0"
        >
          <TabsList>
            <TabsTrigger value="cs">Česky</TabsTrigger>
            <TabsTrigger value="sk">Slovensky</TabsTrigger>
          </TabsList>

          {(["cs", "sk"] as Locale[]).map((locale) => (
            <TabsContent
              key={locale}
              value={locale}
              className="flex-1 flex flex-col gap-4 min-h-0"
            >
              <div className="space-y-2">
                <Label htmlFor={`subject-${locale}`}>{t`Předmět`}</Label>
                <Input
                  id={`subject-${locale}`}
                  placeholder={
                    locale === "cs" ? csPlaceholder : skPlaceholder
                  }
                  value={localeState[locale].customSubject}
                  onChange={(e) =>
                    setLocaleState((prev) => ({
                      ...prev,
                      [locale]: {
                        ...prev[locale],
                        customSubject: e.target.value,
                      },
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`body-${locale}`}>
                  {t`Tělo emailu (HTML override)`}
                </Label>
                <Textarea
                  id={`body-${locale}`}
                  className="font-mono text-sm"
                  rows={6}
                  placeholder={t`Vložte HTML obsah, který bude přidán do těla emailu...`}
                  value={localeState[locale].customBodyHtml}
                  onChange={(e) =>
                    setLocaleState((prev) => ({
                      ...prev,
                      [locale]: {
                        ...prev[locale],
                        customBodyHtml: e.target.value,
                      },
                    }))
                  }
                />
              </div>

              <div className="space-y-2 flex-1 min-h-0">
                <Label>{t`Náhled`}</Label>
                {previewQuery.isLoading && activeLocale === locale ? (
                  <div className="flex items-center justify-center h-64 border rounded-md">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <iframe
                    srcDoc={previewQuery.data ?? ""}
                    className="w-full h-64 rounded-md border bg-white"
                    title={t`Náhled emailu`}
                    sandbox="allow-same-origin"
                  />
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={isBusy}
          >
            {resetMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              t`Obnovit výchozí`
            )}
          </Button>
          <Button onClick={handleSave} disabled={isBusy}>
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              t`Uložit`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
