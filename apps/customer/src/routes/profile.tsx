import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { userApi } from "@samofujera/api-client";
import { Button, Input, Card, CardContent, CardHeader, CardTitle } from "@samofujera/ui";

export function ProfilePage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const profileQuery = useQuery({
    queryKey: ["profile"],
    queryFn: () => userApi.getProfile(),
  });

  const updateMutation = useMutation({
    mutationFn: (newName: string) => userApi.updateProfile({ name: newName }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      setIsEditing(false);
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
    <div>
      <h2 className="mb-4 text-2xl font-bold">Profil</h2>

      {profileQuery.isLoading && (
        <p className="text-muted-foreground">Načítání profilu...</p>
      )}

      {profileQuery.isError && (
        <p className="text-destructive">
          Nepodařilo se načíst profil. Zkuste to prosím znovu.
        </p>
      )}

      {profileQuery.isSuccess && (
        <Card>
          <CardHeader>
            <CardTitle>Osobní údaje</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">E-mail</p>
              <p className="text-sm">{profileQuery.data.data.email}</p>
            </div>

            {isEditing ? (
              <form onSubmit={handleSave} className="space-y-3">
                <div>
                  <label htmlFor="name" className="mb-1 block text-sm font-medium text-muted-foreground">
                    Jméno
                  </label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Vaše jméno"
                    disabled={updateMutation.isPending}
                  />
                </div>

                {updateMutation.isError && (
                  <p className="text-sm text-destructive">
                    Nepodařilo se uložit změny. Zkuste to prosím znovu.
                  </p>
                )}

                <div className="flex gap-2">
                  <Button type="submit" disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? "Ukládání..." : "Uložit"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                    disabled={updateMutation.isPending}
                  >
                    Zrušit
                  </Button>
                </div>
              </form>
            ) : (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Jméno</p>
                <div className="flex items-center gap-3">
                  <p className="text-sm">{profileQuery.data.data.name}</p>
                  <Button variant="outline" size="sm" onClick={handleEdit}>
                    Upravit
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
