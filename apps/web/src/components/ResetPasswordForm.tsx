import { useState, type FormEvent } from "react";
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
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  function getTokenFromUrl(): string {
    if (typeof window === "undefined") return "";
    const params = new URLSearchParams(window.location.search);
    return params.get("token") ?? "";
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const token = getTokenFromUrl();
    if (token === "") {
      setError("Neplatný nebo chybějící odkaz pro obnovení hesla.");
      return;
    }

    setIsLoading(true);

    try {
      await authApi.resetPassword(token, newPassword);
      window.location.href = "/prihlaseni";
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Obnovení hesla se nezdařilo. Zkuste to prosím znovu.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Obnovení hesla</CardTitle>
        <CardDescription>Zadejte své nové heslo.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error !== null && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label htmlFor="newPassword">Nové heslo</Label>
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
            {isLoading ? "Ukládám..." : "Nastavit nové heslo"}
          </Button>
          <a
            href="/prihlaseni"
            className="text-sm text-[var(--primary)] hover:underline"
          >
            Zpět na přihlášení
          </a>
        </CardFooter>
      </form>
    </Card>
  );
}
