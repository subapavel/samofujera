"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { t } from "@lingui/core/macro";
import { Crown, Loader2, Check, X } from "lucide-react";
import {
  membershipApi,
  type MembershipPlan,
  type SubscriptionInfo,
} from "@samofujera/api-client";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@samofujera/ui";
import { PageHeader } from "@/components/dashboard/page-header";

function isSubscription(
  sub: SubscriptionInfo | Record<string, never>,
): sub is SubscriptionInfo {
  return "id" in sub && typeof sub.id === "string";
}

function statusLabel(status: string): string {
  switch (status) {
    case "ACTIVE":
      return t`Aktivní`;
    case "CANCELLED":
      return t`Zrušeno`;
    case "PAST_DUE":
      return t`Po splatnosti`;
    case "INCOMPLETE":
      return t`Neúplné`;
    default:
      return status;
  }
}

function statusVariant(status: string): "default" | "secondary" | "destructive" {
  switch (status) {
    case "ACTIVE":
      return "default";
    case "CANCELLED":
      return "destructive";
    default:
      return "secondary";
  }
}

export function SubscriptionPage() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  const success = searchParams.get("success") === "true";
  const cancelled = searchParams.get("cancelled") === "true";

  const membershipQuery = useQuery({
    queryKey: ["membership"],
    queryFn: () => membershipApi.getSubscription(),
  });

  const subscribeMutation = useMutation({
    mutationFn: (data: { planSlug: string; currency: string }) =>
      membershipApi.subscribe(data),
    onSuccess: (result) => {
      window.location.href = result.data.url;
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => membershipApi.cancelSubscription(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["membership"] });
      setCancelDialogOpen(false);
    },
  });

  const data = membershipQuery.data?.data;
  const subscription = data?.subscription;
  const plans = data?.plans ?? [];
  const hasSubscription = subscription != null && isSubscription(subscription);

  function handleSubscribe(plan: MembershipPlan) {
    subscribeMutation.mutate({ planSlug: plan.slug, currency: "CZK" });
  }

  return (
    <div className="flex flex-1 flex-col gap-4 sm:gap-6">
      <PageHeader
        title={t`Předplatné`}
        subtitle={t`Správa vašeho členského předplatného.`}
      />

      {success && (
        <div className="flex items-center gap-2 rounded-md border border-green-500/50 bg-green-500/10 p-4 text-sm text-green-700 dark:text-green-400">
          <Check className="h-4 w-4 shrink-0" />
          {t`Předplatné bylo úspěšně aktivováno!`}
        </div>
      )}

      {cancelled && (
        <div className="flex items-center gap-2 rounded-md border border-yellow-500/50 bg-yellow-500/10 p-4 text-sm text-yellow-700 dark:text-yellow-400">
          <X className="h-4 w-4 shrink-0" />
          {t`Platba byla zrušena. Můžete to zkusit znovu.`}
        </div>
      )}

      {membershipQuery.isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : membershipQuery.isError ? (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-6 text-center text-sm text-destructive">
          {t`Nepodařilo se načíst informace o předplatném. Zkuste to prosím znovu.`}
        </div>
      ) : hasSubscription ? (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Crown className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>{subscription.planName}</CardTitle>
                <CardDescription>
                  <Badge variant={statusVariant(subscription.status)} className="mt-1">
                    {statusLabel(subscription.status)}
                  </Badge>
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t`Začátek období`}</span>
              <span>
                {new Date(subscription.currentPeriodStart).toLocaleDateString("cs-CZ")}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t`Konec období`}</span>
              <span>
                {new Date(subscription.currentPeriodEnd).toLocaleDateString("cs-CZ")}
              </span>
            </div>
            {subscription.cancelledAt && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t`Zrušeno`}</span>
                <span>
                  {new Date(subscription.cancelledAt).toLocaleDateString("cs-CZ")}
                </span>
              </div>
            )}
          </CardContent>
          {subscription.status === "ACTIVE" && (
            <CardFooter>
              <Button
                variant="destructive"
                onClick={() => setCancelDialogOpen(true)}
              >
                {t`Zrušit předplatné`}
              </Button>
            </CardFooter>
          )}
        </Card>
      ) : plans.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Crown className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {t`Momentálně nejsou dostupné žádné členské plány.`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <Card key={plan.id} className="flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-primary" />
                  {plan.name}
                </CardTitle>
                {plan.description && (
                  <CardDescription>{plan.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="flex-1">
                {plan.features && typeof plan.features === "object" && (
                  <ul className="flex flex-col gap-1.5 text-sm">
                    {Object.entries(plan.features as Record<string, unknown>).map(
                      ([key, value]) => (
                        <li key={key} className="flex items-center gap-2">
                          <Check className="h-3.5 w-3.5 text-green-600" />
                          <span>
                            {key}
                            {value !== true && value !== "all" ? `: ${String(value)}` : ""}
                          </span>
                        </li>
                      ),
                    )}
                  </ul>
                )}
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  onClick={() => handleSubscribe(plan)}
                  disabled={subscribeMutation.isPending}
                >
                  {subscribeMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {t`Předplatit`}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t`Zrušit předplatné`}</DialogTitle>
            <DialogDescription>
              {t`Opravdu chcete zrušit své předplatné? Přístup k obsahu ztratíte na konci aktuálního období.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
              {t`Zpět`}
            </Button>
            <Button
              variant="destructive"
              onClick={() => cancelMutation.mutate()}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {t`Ano, zrušit`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
