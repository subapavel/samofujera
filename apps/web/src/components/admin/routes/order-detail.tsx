"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { t } from "@lingui/core/macro";
import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import type { MessageDescriptor } from "@lingui/core";
import { adminApi } from "@samofujera/api-client";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Separator,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@samofujera/ui";

const STATUS_LABELS: Record<string, MessageDescriptor> = {
  PENDING: msg`Čekající`,
  PAID: msg`Zaplaceno`,
  CANCELLED: msg`Zrušeno`,
  REFUNDED: msg`Vráceno`,
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  PENDING: "outline",
  PAID: "default",
  CANCELLED: "secondary",
  REFUNDED: "destructive",
};

const PRODUCT_TYPE_LABELS: Record<string, MessageDescriptor> = {
  DIGITAL: msg`Digitální`,
  STREAMING: msg`Streaming`,
  PHYSICAL: msg`Fyzický`,
  EVENT: msg`Událost`,
};

export function OrderDetailPage() {
  const { _ } = useLingui();
  const params = useParams();
  const orderId = params.orderId as string;
  const router = useRouter();
  const queryClient = useQueryClient();

  const [carrier, setCarrier] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");
  const [shippingLoaded, setShippingLoaded] = useState(false);

  const orderQuery = useQuery({
    queryKey: ["admin", "order", orderId],
    queryFn: () => adminApi.getOrder(orderId),
    enabled: Boolean(orderId),
  });

  const order = orderQuery.data?.data;

  useEffect(() => {
    if (order?.shipping && !shippingLoaded) {
      setCarrier(order.shipping.carrier ?? "");
      setTrackingNumber(order.shipping.trackingNumber ?? "");
      setTrackingUrl(order.shipping.trackingUrl ?? "");
      setShippingLoaded(true);
    }
  }, [order, shippingLoaded]);

  const shippingMutation = useMutation({
    mutationFn: () =>
      adminApi.updateShipping(orderId, {
        carrier: carrier || undefined,
        trackingNumber: trackingNumber || undefined,
        trackingUrl: trackingUrl || undefined,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "order", orderId] });
    },
  });

  function handleShippingSubmit(event: React.FormEvent) {
    event.preventDefault();
    shippingMutation.mutate();
  }

  const hasPhysicalItems = order?.items.some((item) => item.productType === "PHYSICAL");

  if (orderQuery.isLoading) {
    return <p className="text-[var(--muted-foreground)]">{t`Načítání objednávky...`}</p>;
  }

  if (orderQuery.isError) {
    return (
      <p className="text-[var(--destructive)]">
        {t`Nepodařilo se načíst objednávku. Zkuste to prosím znovu.`}
      </p>
    );
  }

  if (!order) {
    return <p className="text-[var(--muted-foreground)]">{t`Objednávka nenalezena.`}</p>;
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => router.push("/admin/objednavky")}>
          {t`Zpět`}
        </Button>
        <h2 className="text-2xl font-bold">{t`Objednávka`}</h2>
      </div>

      {/* Order Info */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t`Informace o objednávce`}</CardTitle>
              <CardDescription className="font-mono text-xs">{order.id}</CardDescription>
            </div>
            <Badge variant={STATUS_VARIANT[order.status] ?? "outline"}>
              {_(STATUS_LABELS[order.status]) ?? order.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-3">
            <div>
              <p className="font-medium text-[var(--muted-foreground)]">{t`Datum`}</p>
              <p>{new Date(order.createdAt).toLocaleString("cs-CZ")}</p>
            </div>
            <div>
              <p className="font-medium text-[var(--muted-foreground)]">{t`Celkem`}</p>
              <p className="text-lg font-semibold">
                {order.totalAmount} {order.currency}
              </p>
            </div>
            {order.discountAmount > 0 && (
              <div>
                <p className="font-medium text-[var(--muted-foreground)]">{t`Sleva`}</p>
                <p>
                  {order.discountAmount} {order.currency}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Order Items */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{t`Položky`}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t`Produkt`}</TableHead>
                <TableHead>{t`Typ`}</TableHead>
                <TableHead className="text-right">{t`Množství`}</TableHead>
                <TableHead className="text-right">{t`Jednotková cena`}</TableHead>
                <TableHead className="text-right">{t`Celkem`}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.productTitle}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {_(PRODUCT_TYPE_LABELS[item.productType]) ?? item.productType}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right">
                    {item.unitPrice} {order.currency}
                  </TableCell>
                  <TableCell className="text-right">
                    {item.totalPrice} {order.currency}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Shipping Section (for physical products) */}
      {hasPhysicalItems && (
        <Card>
          <CardHeader>
            <CardTitle>{t`Doprava`}</CardTitle>
          </CardHeader>
          <CardContent>
            {order.shipping && (order.shipping.shippedAt || order.shipping.deliveredAt) && (
              <>
                <div className="space-y-2 text-sm">
                  {order.shipping.shippedAt && (
                    <div className="flex justify-between">
                      <span className="font-medium text-[var(--muted-foreground)]">{t`Odesláno`}</span>
                      <span>{new Date(order.shipping.shippedAt).toLocaleString("cs-CZ")}</span>
                    </div>
                  )}
                  {order.shipping.deliveredAt && (
                    <div className="flex justify-between">
                      <span className="font-medium text-[var(--muted-foreground)]">{t`Doručeno`}</span>
                      <span>{new Date(order.shipping.deliveredAt).toLocaleString("cs-CZ")}</span>
                    </div>
                  )}
                </div>
                <Separator className="my-4" />
              </>
            )}

            <form onSubmit={handleShippingSubmit} className="space-y-4">
              <div>
                <Label htmlFor="carrier">{t`Dopravce`}</Label>
                <Input
                  id="carrier"
                  value={carrier}
                  onChange={(e) => setCarrier(e.target.value)}
                  placeholder={t`Zásilkovna, PPL, DPD...`}
                  disabled={shippingMutation.isPending}
                />
              </div>
              <div>
                <Label htmlFor="trackingNumber">{t`Číslo zásilky`}</Label>
                <Input
                  id="trackingNumber"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  disabled={shippingMutation.isPending}
                />
              </div>
              <div>
                <Label htmlFor="trackingUrl">{t`URL sledování`}</Label>
                <Input
                  id="trackingUrl"
                  value={trackingUrl}
                  onChange={(e) => setTrackingUrl(e.target.value)}
                  placeholder="https://..."
                  disabled={shippingMutation.isPending}
                />
              </div>

              {shippingMutation.isError && (
                <p className="text-sm text-[var(--destructive)]">
                  {t`Nepodařilo se uložit údaje o dopravě.`}
                </p>
              )}

              {shippingMutation.isSuccess && (
                <p className="text-sm text-green-600">{t`Údaje o dopravě byly uloženy.`}</p>
              )}

              <Button type="submit" disabled={shippingMutation.isPending}>
                {shippingMutation.isPending ? t`Ukládání...` : t`Uložit dopravu`}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
