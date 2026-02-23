"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const token = searchParams.get("token") ?? "";
    if (token === "") {
      setError(t`Neplatný nebo chybějící odkaz pro obnovení hesla.`);
      return;
    }

    setIsLoading(true);

    try {
      await authApi.resetPassword(token, newPassword);
      router.push("/prihlaseni");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError(t`Obnovení hesla se nezdařilo. Zkuste to prosím znovu.`);
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t`Obnovení hesla`}</CardTitle>
        <CardDescription>{t`Zadejte své nové heslo.`}</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error !== null && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label htmlFor="newPassword">{t`Nové heslo`}</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? t`Ukládám...` : t`Nastavit nové heslo`}
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
