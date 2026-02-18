"use client";

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

export function DeleteAccountPage() {
  const [password, setPassword] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: (pwd: string) => userApi.deleteAccount(pwd),
    onSuccess: () => {
      window.location.href = "/";
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
      <h2 className="mb-4 text-2xl font-bold">Smazat ucet</h2>

      <Alert variant="destructive" className="mb-6">
        <AlertTitle>Upozorneni</AlertTitle>
        <AlertDescription>
          Smazani uctu je nevratna akce. Vsechna vase data, vcetne historie objednavek, clenstvi
          a pristupu k zakoupenemu obsahu, budou trvale odstranena. Tuto akci nelze vratit zpet.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Trvale smazani uctu</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-sm font-medium text-[var(--muted-foreground)]"
            >
              Pro potvrzeni zadejte sve heslo
            </label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Vase heslo"
              disabled={deleteMutation.isPending}
            />
          </div>

          {deleteMutation.isError && (
            <p className="text-sm text-[var(--destructive)]">
              Nepodarilo se smazat ucet. Zkontrolujte heslo a zkuste to znovu.
            </p>
          )}

          <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
            <DialogTrigger asChild>
              <Button
                variant="destructive"
                disabled={!password.trim() || deleteMutation.isPending}
              >
                Smazat muj ucet
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Opravdu chcete smazat svuj ucet?</DialogTitle>
                <DialogDescription>
                  Tato akce je nevratna. Vsechna vase data budou trvale odstranena
                  a nebude mozne je obnovit.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Zrusit
                </Button>
                <Button
                  variant="destructive"
                  disabled={deleteMutation.isPending}
                  onClick={handleConfirmDelete}
                >
                  {deleteMutation.isPending ? "Mazani..." : "Ano, smazat ucet"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
}
