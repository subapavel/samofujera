"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { t } from "@lingui/core/macro";
import {
  Button,
  Input,
  Label,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Alert,
  AlertDescription,
} from "@samofujera/ui";
import { authApi, ApiError } from "@samofujera/api-client";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await authApi.forgotPassword(email);
      setSuccess(true);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError(t`Odeslání se nezdařilo. Zkuste to prosím znovu.`);
      }
    } finally {
      setIsLoading(false);
    }
  }

  if (success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t`E-mail odeslán`}</CardTitle>
          <CardDescription>
            {t`Pokud účet s tímto e-mailem existuje, odeslali jsme vám odkaz pro obnovení hesla. Zkontrolujte svou e-mailovou schránku.`}
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Link
            href="/prihlaseni"
            className="text-sm text-[var(--primary)] hover:underline"
          >
            {t`Zpět na přihlášení`}
          </Link>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t`Zapomenuté heslo`}</CardTitle>
        <CardDescription>
          {t`Zadejte svůj e-mail a my vám pošleme odkaz pro obnovení hesla.`}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error !== null && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">{t`E-mail`}</Label>
            <Input
              id="email"
              type="email"
              placeholder={t`vas@email.cz`}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? t`Odesílám...` : t`Odeslat odkaz`}
          </Button>
          <Link
            href="/prihlaseni"
            className="text-sm text-[var(--primary)] hover:underline"
          >
            {t`Zpět na přihlášení`}
          </Link>
        </CardFooter>
      </form>
    </Card>
  );
}
