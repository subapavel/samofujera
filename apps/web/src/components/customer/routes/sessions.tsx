"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { t } from "@lingui/core/macro";
import { userApi } from "@samofujera/api-client";
import {
  Button,
  Badge,
  Card,
  CardContent,
} from "@samofujera/ui";
import { useImpersonation } from "@/components/auth/ImpersonationGuard";
import { SettingsLayout } from "../settings-layout";

export function SessionsPage() {
  const queryClient = useQueryClient();
  const { active: isImpersonating } = useImpersonation();

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
    <SettingsLayout>
      {sessionsQuery.isLoading && (
        <p className="text-muted-foreground">{t`Načítání sezení...`}</p>
      )}

      {sessionsQuery.isError && (
        <p className="text-destructive">
          {t`Nepodařilo se načíst sezení. Zkuste to prosím znovu.`}
        </p>
      )}

      {sessionsQuery.isSuccess && (
        <>
          {sessionsQuery.data.data.length === 0 ? (
            <p className="text-muted-foreground">{t`Žádná aktivní sezení.`}</p>
          ) : (
            <div className="space-y-4">
              {sessionsQuery.data.data.map((session) => (
                <Card key={session.sessionId}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">
                          {session.deviceName}
                        </p>
                        {session.current && (
                          <Badge variant="secondary">{t`Toto zařízení`}</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        IP: {session.ipAddress}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t`Poslední aktivita`}:{" "}
                        {new Date(session.lastActiveAt).toLocaleString("cs-CZ")}
                      </p>
                    </div>
                    {!session.current && (
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={isImpersonating || revokeMutation.isPending}
                        onClick={() =>
                          revokeMutation.mutate(session.sessionId)
                        }
                      >
                        {t`Odvolat`}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </SettingsLayout>
  );
}
