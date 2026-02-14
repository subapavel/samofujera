import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { userApi } from "@samofujera/api-client";
import { Button } from "@samofujera/ui";

export function SessionsPage() {
  const queryClient = useQueryClient();

  const sessionsQuery = useQuery({
    queryKey: ["sessions"],
    queryFn: () => userApi.getSessions(),
  });

  const revokeMutation = useMutation({
    mutationFn: (sessionId: string) => userApi.revokeSession(sessionId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["sessions"] });
    },
  });

  return (
    <div>
      <h2 className="mb-4 text-2xl font-bold">Aktivní sezení</h2>
      <div className="rounded-lg border border-border bg-card p-6">
        {sessionsQuery.isLoading && (
          <p className="text-muted-foreground">Načítání sezení...</p>
        )}

        {sessionsQuery.isError && (
          <p className="text-destructive">
            Nepodařilo se načíst sezení. Zkuste to prosím znovu.
          </p>
        )}

        {sessionsQuery.isSuccess && (
          <>
            {sessionsQuery.data.data.length === 0 ? (
              <p className="text-muted-foreground">Žádná aktivní sezení.</p>
            ) : (
              <div className="space-y-4">
                {sessionsQuery.data.data.map((session) => (
                  <div
                    key={session.sessionId}
                    className="flex items-center justify-between rounded-md border border-border p-4"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{session.deviceName}</p>
                      <p className="text-xs text-muted-foreground">
                        IP: {session.ipAddress}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Poslední aktivita:{" "}
                        {new Date(session.lastActiveAt).toLocaleString("cs-CZ")}
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={revokeMutation.isPending}
                      onClick={() => revokeMutation.mutate(session.sessionId)}
                    >
                      Odvolat
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
