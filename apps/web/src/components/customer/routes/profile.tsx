"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { t } from "@lingui/core/macro";
import { userApi } from "@samofujera/api-client";
import { Button, Input, Card, CardContent, CardHeader, CardTitle } from "@samofujera/ui";
import { SettingsLayout } from "../settings-layout";

export function ProfilePage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [locale, setLocale] = useState<string>("");

  const profileQuery = useQuery({
    queryKey: ["profile"],
    queryFn: () => userApi.getProfile(),
  });

  useEffect(() => {
    if (profileQuery.data) {
      setLocale(profileQuery.data.data.locale ?? "cs");
    }
  }, [profileQuery.data]);

  const updateMutation = useMutation({
    mutationFn: (newName: string) => userApi.updateProfile({ name: newName }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      setIsEditing(false);
    },
  });

  const localeMutation = useMutation({
    mutationFn: (newLocale: string) => userApi.updateLocale(newLocale),
    onSuccess: (_data: unknown, newLocale: string) => {
      document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=${60 * 60 * 24 * 365}`;
      window.location.reload();
    },
  });

  function handleEdit() {
    if (profileQuery.data) {
      setName(profileQuery.data.data.name);
      setIsEditing(true);
    }
  }

  function handleSave(event: React.FormEvent) {
    event.preventDefault();
    if (name.trim()) {
      updateMutation.mutate(name.trim());
    }
  }

  function handleCancel() {
    setIsEditing(false);
    setName("");
    updateMutation.reset();
  }

  return (
    <SettingsLayout>
      {profileQuery.isLoading && (
        <p className="text-muted-foreground">{t`Načítání profilu...`}</p>
      )}

      {profileQuery.isError && (
        <p className="text-destructive">
          {t`Nepodařilo se načíst profil. Zkuste to prosím znovu.`}
        </p>
      )}

      {profileQuery.isSuccess && (
        <Card>
          <CardHeader>
            <CardTitle>{t`Osobní údaje`}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t`E-mail`}</p>
              <p className="text-sm">{profileQuery.data.data.email}</p>
            </div>

            {isEditing ? (
              <form onSubmit={handleSave} className="space-y-3">
                <div>
                  <label htmlFor="name" className="mb-1 block text-sm font-medium text-muted-foreground">
                    {t`Jméno`}
                  </label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t`Vaše jméno`}
                    disabled={updateMutation.isPending}
                  />
                </div>

                {updateMutation.isError && (
                  <p className="text-sm text-destructive">
                    {t`Nepodařilo se uložit změny. Zkuste to prosím znovu.`}
                  </p>
                )}

                <div className="flex gap-2">
                  <Button type="submit" disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? t`Ukládání...` : t`Uložit`}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                    disabled={updateMutation.isPending}
                  >
                    {t`Zrušit`}
                  </Button>
                </div>
              </form>
            ) : (
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t`Jméno`}</p>
                <div className="flex items-center gap-3">
                  <p className="text-sm">{profileQuery.data.data.name}</p>
                  <Button variant="outline" size="sm" onClick={handleEdit}>
                    {t`Upravit`}
                  </Button>
                </div>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t`Jazyk`}</p>
              <div className="mt-1 flex gap-2">
                <Button
                  variant={locale === "cs" ? "default" : "outline"}
                  size="sm"
                  disabled={localeMutation.isPending}
                  onClick={() => localeMutation.mutate("cs")}
                >
                  Čeština
                </Button>
                <Button
                  variant={locale === "sk" ? "default" : "outline"}
                  size="sm"
                  disabled={localeMutation.isPending}
                  onClick={() => localeMutation.mutate("sk")}
                >
                  Slovenčina
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </SettingsLayout>
  );
}
