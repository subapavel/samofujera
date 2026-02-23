"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { adminApi } from "@samofujera/api-client";
import { Button, Input, Label, Card, CardContent, CardHeader, CardTitle } from "@samofujera/ui";

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Čekající",
  PAID: "Zaplaceno",
  CANCELLED: "Zrušeno",
  REFUNDED: "Vráceno",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  PAID: "bg-green-100 text-green-700",
  CANCELLED: "bg-gray-100 text-gray-700",
  REFUNDED: "bg-red-100 text-red-700",
};

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  DIGITAL: "Digitální",
  STREAMING: "Streaming",
  PHYSICAL: "Fyzický",
  EVENT: "Událost",
};

export function OrderDetailPage() {
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
    return <p className="text-[var(--muted-foreground)]">Načítání objednávky...</p>;
  }

  if (orderQuery.isError) {
    return (
      <p className="text-[var(--destructive)]">
        Nepodařilo se načíst objednávku. Zkuste to prosím znovu.
      </p>
    );
  }

  if (!order) {
    return <p className="text-[var(--muted-foreground)]">Objednávka nenalezena.</p>;
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => router.push("/admin/objednavky")}>
          Zpět
        </Button>
        <h2 className="text-2xl font-bold">Objednávka</h2>
      </div>

      {/* Order Info */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Informace o objednávce</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
            <div>
              <p className="font-medium text-[var(--muted-foreground)]">ID</p>
              <p className="font-mono text-xs">{order.id}</p>
            </div>
            <div>
              <p className="font-medium text-[var(--muted-foreground)]">Stav</p>
              <span
                className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[order.status] ?? ""}`}
              >
                {STATUS_LABELS[order.status] ?? order.status}
              </span>
            </div>
            <div>
              <p className="font-medium text-[var(--muted-foreground)]">Celkem</p>
              <p>
                {order.totalAmount} {order.currency}
              </p>
            </div>
            <div>
              <p className="font-medium text-[var(--muted-foreground)]">Datum</p>
              <p>{new Date(order.createdAt).toLocaleString("cs-CZ")}</p>
            </div>
          </div>
          {order.discountAmount > 0 && (
            <div className="mt-3 text-sm">
              <span className="font-medium text-[var(--muted-foreground)]">Sleva: </span>
              <span>
                {order.discountAmount} {order.currency}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Items */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Položky</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="pb-2 font-medium text-[var(--muted-foreground)]">Produkt</th>
                <th className="pb-2 font-medium text-[var(--muted-foreground)]">Typ</th>
                <th className="pb-2 font-medium text-[var(--muted-foreground)]">Množství</th>
                <th className="pb-2 font-medium text-[var(--muted-foreground)]">Jednotková cena</th>
                <th className="pb-2 font-medium text-[var(--muted-foreground)]">Celkem</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id} className="border-b border-[var(--border)] last:border-b-0">
                  <td className="py-3 font-medium">{item.productTitle}</td>
                  <td className="py-3">
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                      {PRODUCT_TYPE_LABELS[item.productType] ?? item.productType}
                    </span>
                  </td>
                  <td className="py-3">{item.quantity}</td>
                  <td className="py-3">
                    {item.unitPrice} {order.currency}
                  </td>
                  <td className="py-3">
                    {item.totalPrice} {order.currency}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Shipping Section (for physical products) */}
      {hasPhysicalItems && (
        <Card>
          <CardHeader>
            <CardTitle>Doprava</CardTitle>
          </CardHeader>
          <CardContent>
            {order.shipping && (order.shipping.shippedAt || order.shipping.deliveredAt) && (
              <div className="mb-4 space-y-1 text-sm">
                {order.shipping.shippedAt && (
                  <p>
                    <span className="font-medium text-[var(--muted-foreground)]">Odesláno: </span>
                    {new Date(order.shipping.shippedAt).toLocaleString("cs-CZ")}
                  </p>
                )}
                {order.shipping.deliveredAt && (
                  <p>
                    <span className="font-medium text-[var(--muted-foreground)]">Doručeno: </span>
                    {new Date(order.shipping.deliveredAt).toLocaleString("cs-CZ")}
                  </p>
                )}
              </div>
            )}

            <form onSubmit={handleShippingSubmit} className="space-y-4">
              <div>
                <Label htmlFor="carrier">Dopravce</Label>
                <Input
                  id="carrier"
                  value={carrier}
                  onChange={(e) => setCarrier(e.target.value)}
                  placeholder="Zásilkovna, PPL, DPD..."
                  disabled={shippingMutation.isPending}
                />
              </div>
              <div>
                <Label htmlFor="trackingNumber">Číslo zásilky</Label>
                <Input
                  id="trackingNumber"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  disabled={shippingMutation.isPending}
                />
              </div>
              <div>
                <Label htmlFor="trackingUrl">URL sledování</Label>
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
                  Nepodařilo se uložit údaje o dopravě.
                </p>
              )}

              {shippingMutation.isSuccess && (
                <p className="text-sm text-green-600">Údaje o dopravě byly uloženy.</p>
              )}

              <Button type="submit" disabled={shippingMutation.isPending}>
                {shippingMutation.isPending ? "Ukládání..." : "Uložit dopravu"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
