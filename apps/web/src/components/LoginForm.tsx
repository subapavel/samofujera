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

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionConflict, setSessionConflict] = useState<string | null>(null);

  async function doLogin(force: boolean) {
    setError(null);
    setIsLoading(true);

    try {
      await authApi.login({ email, password, force });
      window.location.href = "/muj-ucet";
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        const body = err.body as { existingDevice?: string } | null;
        setSessionConflict(
          body?.existingDevice ?? "jiné zařízení"
        );
      } else if (err instanceof ApiError && err.status === 401) {
        setError("Nesprávný e-mail nebo heslo.");
      } else {
        setError("Přihlášení se nezdařilo. Zkuste to prosím znovu.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSessionConflict(null);
    await doLogin(false);
  }

  async function handleForceLogin() {
    setSessionConflict(null);
    await doLogin(true);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Přihlášení</CardTitle>
        <CardDescription>
          Zadejte svůj e-mail a heslo pro přihlášení.
        </CardDescription>
      </CardHeader>
      <form onSubmit={(e) => void handleSubmit(e)}>
        <CardContent className="space-y-4">
          {error !== null && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {sessionConflict !== null && (
            <Alert>
              <AlertDescription>
                <p className="mb-2">
                  Máte aktivní sezení na zařízení: <strong>{sessionConflict}</strong>.
                  Chcete se přihlásit zde a odhlásit druhé zařízení?
                </p>
                <Button
                  type="button"
                  size="sm"
                  disabled={isLoading}
                  onClick={() => void handleForceLogin()}
                >
                  Ano, přihlásit se zde
                </Button>
              </AlertDescription>
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
          <div className="space-y-2">
            <Label htmlFor="password">Heslo</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          <div className="text-sm">
            <a
              href="/zapomenute-heslo"
              className="text-[var(--primary)] hover:underline"
            >
              Zapomenuté heslo?
            </a>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Přihlašuji..." : "Přihlásit se"}
          </Button>
          <p className="text-sm text-[var(--muted-foreground)] text-center">
            Nemáte účet?{" "}
            <a href="/registrace" className="text-[var(--primary)] hover:underline">
              Zaregistrujte se
            </a>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
