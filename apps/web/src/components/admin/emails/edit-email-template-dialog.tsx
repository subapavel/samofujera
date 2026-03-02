"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { t } from "@lingui/core/macro";
import { Loader2, CheckCircle2 } from "lucide-react";
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
  const [isLoading, setIsLoading] = useState(true);
  const [testSentLocale, setTestSentLocale] = useState<Locale | null>(null);
  const [localeState, setLocaleState] = useState<Record<Locale, LocaleState>>({
    cs: { customSubject: "", customBodyHtml: "" },
    sk: { customSubject: "", customBodyHtml: "" },
  });

  useEffect(() => {
    if (!open) return;
    setIsLoading(true);
    setTestSentLocale(null);
    Promise.all([
      adminApi.getEmailDefaultSubjects(template.key),
      adminApi.getEmailCurrentOverride(template.key, "cs"),
      adminApi.getEmailCurrentOverride(template.key, "sk"),
      adminApi.getEmailTemplateSource(template.key, "cs"),
      adminApi.getEmailTemplateSource(template.key, "sk"),
    ]).then(([defaults, csOverride, skOverride, csSource, skSource]) => {
      setLocaleState({
        cs: {
          customSubject: csOverride.customSubject ?? defaults.cs,
          customBodyHtml: csOverride.customBodyHtml ?? csSource,
        },
        sk: {
          customSubject: skOverride.customSubject ?? defaults.sk,
          customBodyHtml: skOverride.customBodyHtml ?? skSource,
        },
      });
      setIsLoading(false);
    });
  }, [open, template.key]);

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

  const testMutation = useMutation({
    mutationFn: () => adminApi.sendTestEmail(template.key, activeLocale),
    onSuccess: () => {
      setTestSentLocale(activeLocale);
      setTimeout(() => setTestSentLocale(null), 3000);
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

  const isBusy =
    saveMutation.isPending || resetMutation.isPending || testMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{template.nameCzech}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
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
                  <iframe
                    srcDoc={localeState[locale].customBodyHtml}
                    className="w-full h-64 rounded-md border bg-white"
                    title={t`Náhled emailu`}
                    sandbox="allow-same-origin"
                  />
                </div>
              </TabsContent>
            ))}
          </Tabs>
        )}

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={isBusy || isLoading}
          >
            {resetMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              t`Obnovit výchozí`
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => testMutation.mutate()}
            disabled={isBusy || isLoading}
          >
            {testMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : testSentLocale === activeLocale ? (
              <>
                <CheckCircle2 className="h-4 w-4 mr-1 text-green-600" />
                {t`Odesláno`}
              </>
            ) : (
              t`Odeslat testovací email`
            )}
          </Button>
          <Button onClick={handleSave} disabled={isBusy || isLoading}>
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
