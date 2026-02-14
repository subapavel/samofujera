import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { userApi } from "@samofujera/api-client";
import {
  Button,
  Input,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Alert,
  AlertTitle,
  AlertDescription,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@samofujera/ui";

const HOMEPAGE_URL = "http://localhost:4321";

export function DeleteAccountPage() {
  const [password, setPassword] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: (pwd: string) => userApi.deleteAccount(pwd),
    onSuccess: () => {
      window.location.href = HOMEPAGE_URL;
    },
  });

  function handleConfirmDelete() {
    if (password.trim()) {
      deleteMutation.mutate(password);
    }
  }

  function handleDialogOpenChange(open: boolean) {
    setDialogOpen(open);
    if (!open) {
      deleteMutation.reset();
    }
  }

  return (
    <div>
      <h2 className="mb-4 text-2xl font-bold">Smazat účet</h2>

      <Alert variant="destructive" className="mb-6">
        <AlertTitle>Upozornění</AlertTitle>
        <AlertDescription>
          Smazání účtu je nevratná akce. Všechna vaše data, včetně historie objednávek, členství
          a přístupu k zakoupenému obsahu, budou trvale odstraněna. Tuto akci nelze vrátit zpět.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Trvalé smazání účtu</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-sm font-medium text-muted-foreground"
            >
              Pro potvrzení zadejte své heslo
            </label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Vaše heslo"
              disabled={deleteMutation.isPending}
            />
          </div>

          {deleteMutation.isError && (
            <p className="text-sm text-destructive">
              Nepodařilo se smazat účet. Zkontrolujte heslo a zkuste to znovu.
            </p>
          )}

          <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
            <DialogTrigger asChild>
              <Button
                variant="destructive"
                disabled={!password.trim() || deleteMutation.isPending}
              >
                Smazat můj účet
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Opravdu chcete smazat svůj účet?</DialogTitle>
                <DialogDescription>
                  Tato akce je nevratná. Všechna vaše data budou trvale odstraněna
                  a nebude možné je obnovit.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Zrušit
                </Button>
                <Button
                  variant="destructive"
                  disabled={deleteMutation.isPending}
                  onClick={handleConfirmDelete}
                >
                  {deleteMutation.isPending ? "Mazání..." : "Ano, smazat účet"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
}
