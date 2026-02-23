"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { t } from "@lingui/core/macro";
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
import { SettingsLayout } from "../settings-layout";

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
    <SettingsLayout>
      <Alert variant="destructive" className="mb-6">
        <AlertTitle>{t`Upozornění`}</AlertTitle>
        <AlertDescription>
          {t`Smazání účtu je nevratná akce. Všechna vaše data, včetně historie objednávek, členství a přístupu k zakoupenému obsahu, budou trvale odstraněna. Tuto akci nelze vrátit zpět.`}
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>{t`Trvalé smazání účtu`}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-sm font-medium text-muted-foreground"
            >
              {t`Pro potvrzení zadejte své heslo`}
            </label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t`Vaše heslo`}
              disabled={deleteMutation.isPending}
            />
          </div>

          {deleteMutation.isError && (
            <p className="text-sm text-destructive">
              {t`Nepodařilo se smazat účet. Zkontrolujte heslo a zkuste to znovu.`}
            </p>
          )}

          <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
            <DialogTrigger asChild>
              <Button
                variant="destructive"
                disabled={!password.trim() || deleteMutation.isPending}
              >
                {t`Smazat můj účet`}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t`Opravdu chcete smazat svůj účet?`}</DialogTitle>
                <DialogDescription>
                  {t`Tato akce je nevratná. Všechna vaše data budou trvale odstraněna a nebude možné je obnovit.`}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  {t`Zrušit`}
                </Button>
                <Button
                  variant="destructive"
                  disabled={deleteMutation.isPending}
                  onClick={handleConfirmDelete}
                >
                  {deleteMutation.isPending ? t`Mazání...` : t`Ano, smazat účet`}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </SettingsLayout>
  );
}
