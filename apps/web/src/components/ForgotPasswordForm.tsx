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
        setError("Odeslání se nezdařilo. Zkuste to prosím znovu.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  if (success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>E-mail odeslán</CardTitle>
          <CardDescription>
            Pokud účet s tímto e-mailem existuje, odeslali jsme vám odkaz pro
            obnovení hesla. Zkontrolujte svou e-mailovou schránku.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <a
            href="/prihlaseni"
            className="text-sm text-[var(--primary)] hover:underline"
          >
            Zpět na přihlášení
          </a>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Zapomenuté heslo</CardTitle>
        <CardDescription>
          Zadejte svůj e-mail a my vám pošleme odkaz pro obnovení hesla.
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
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              placeholder="vas@email.cz"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Odesílám..." : "Odeslat odkaz"}
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
