"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { t } from "@lingui/core/macro";
import { Button, Input, Card, CardContent, CardHeader, CardTitle } from "@samofujera/ui";
import { leadApi } from "@samofujera/api-client";

interface LeadCaptureFormProps {
  slug: string;
  productTitle: string;
}

export function LeadCaptureForm({ slug, productTitle }: LeadCaptureFormProps) {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setErrorMessage("");

    try {
      await leadApi.captureLeadForProduct(slug, email, {
        utm_source: searchParams.get("utm_source") ?? undefined,
        utm_medium: searchParams.get("utm_medium") ?? undefined,
        utm_campaign: searchParams.get("utm_campaign") ?? undefined,
        utm_content: searchParams.get("utm_content") ?? undefined,
      });
      setStatus("success");
    } catch {
      setStatus("error");
      setErrorMessage(t`Nepodařilo se odeslat. Zkuste to prosím znovu.`);
    }
  };

  if (status === "success") {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-2">
            <p className="text-lg font-semibold">
              {t`Zkontrolujte svůj email`}
            </p>
            <p className="text-muted-foreground">
              {t`Odkaz pro přístup k obsahu jsme vám poslali na ${email}.`}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t`Získejte zdarma: ${productTitle}`}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Input
              type="email"
              placeholder={t`Váš email`}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={status === "loading"}
            />
          </div>
          {status === "error" && (
            <p className="text-sm text-destructive">{errorMessage}</p>
          )}
          <Button type="submit" className="w-full" disabled={status === "loading"}>
            {status === "loading" ? t`Odesílám...` : t`Získat zdarma`}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            {t`Zadáním emailu souhlasíte se zpracováním osobních údajů.`}
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
