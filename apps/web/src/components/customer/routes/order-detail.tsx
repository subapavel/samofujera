"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { ordersApi } from "@samofujera/api-client";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@samofujera/ui";

const statusConfig: Record<string, { label: string; className: string }> = {
  PENDING: {
    label: "Čeká na platbu",
    className: "bg-yellow-100 text-yellow-800",
  },
  PAID: {
    label: "Zaplaceno",
    className: "bg-green-100 text-green-800",
  },
  CANCELLED: {
    label: "Zrušeno",
    className: "bg-gray-100 text-gray-600",
  },
  REFUNDED: {
    label: "Vráceno",
    className: "bg-blue-100 text-blue-800",
  },
};

function formatPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat("cs-CZ", {
    style: "currency",
    currency,
  }).format(amount / 100);
}

export function OrderDetailPage() {
  const params = useParams();
  const orderId = params.orderId as string;
  const router = useRouter();

  const orderQuery = useQuery({
    queryKey: ["orders", orderId],
    queryFn: () => ordersApi.getOrder(orderId),
    enabled: Boolean(orderId),
  });

  const order = orderQuery.data?.data;

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/muj-ucet/objednavky")}
        >
          Zpět na objednávky
        </Button>
        <h2 className="text-2xl font-bold">Detail objednávky</h2>
      </div>

      {orderQuery.isLoading && (
        <div className="space-y-4">
          <div className="h-24 animate-pulse rounded-lg border border-[var(--border)] bg-[var(--card)]" />
          <div className="h-48 animate-pulse rounded-lg border border-[var(--border)] bg-[var(--card)]" />
        </div>
      )}

      {orderQuery.isError && (
        <p className="text-[var(--destructive)]">
          Nepodařilo se načíst objednávku. Zkuste to prosím znovu.
        </p>
      )}

      {orderQuery.isSuccess && order && (
        <div className="space-y-4">
          {/* Order info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <span>Objednávka</span>
                <span className="font-mono text-sm font-normal text-[var(--muted-foreground)]">
                  {order.id}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-sm font-medium text-[var(--muted-foreground)]">
                    Stav
                  </p>
                  {(() => {
                    const status = statusConfig[order.status] ?? {
                      label: order.status,
                      className: "bg-gray-100 text-gray-600",
                    };
                    return (
                      <span
                        className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${status.className}`}
                      >
                        {status.label}
                      </span>
                    );
                  })()}
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--muted-foreground)]">
                    Datum
                  </p>
                  <p className="mt-1 text-sm">
                    {new Date(order.createdAt).toLocaleDateString("cs-CZ")}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--muted-foreground)]">
                    Celkem
                  </p>
                  <p className="mt-1 text-sm font-semibold">
                    {formatPrice(order.totalAmount, order.currency)}
                  </p>
                  {order.discountAmount > 0 && (
                    <p className="text-xs text-[var(--muted-foreground)]">
                      Sleva: -{formatPrice(order.discountAmount, order.currency)}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Order items */}
          <Card>
            <CardHeader>
              <CardTitle>Položky</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-hidden rounded-md border border-[var(--border)]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-[var(--accent)]">
                      <th className="px-4 py-2 text-left font-medium text-[var(--muted-foreground)]">
                        Produkt
                      </th>
                      <th className="px-4 py-2 text-right font-medium text-[var(--muted-foreground)]">
                        Množství
                      </th>
                      <th className="px-4 py-2 text-right font-medium text-[var(--muted-foreground)]">
                        Cena
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((item) => (
                      <tr
                        key={item.id}
                        className="border-b border-[var(--border)] last:border-b-0"
                      >
                        <td className="px-4 py-2">{item.productTitle}</td>
                        <td className="px-4 py-2 text-right">
                          {item.quantity}
                        </td>
                        <td className="px-4 py-2 text-right">
                          {formatPrice(item.totalPrice, order.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Shipping */}
          {order.shipping && (
            <Card>
              <CardHeader>
                <CardTitle>Doručení</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {order.shipping.carrier && (
                    <div>
                      <p className="text-sm font-medium text-[var(--muted-foreground)]">
                        Dopravce
                      </p>
                      <p className="mt-1 text-sm">{order.shipping.carrier}</p>
                    </div>
                  )}
                  {order.shipping.trackingNumber && (
                    <div>
                      <p className="text-sm font-medium text-[var(--muted-foreground)]">
                        Sledovací číslo
                      </p>
                      {order.shipping.trackingUrl ? (
                        <a
                          href={order.shipping.trackingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 inline-block text-sm text-[var(--primary)] underline"
                        >
                          {order.shipping.trackingNumber}
                        </a>
                      ) : (
                        <p className="mt-1 text-sm">
                          {order.shipping.trackingNumber}
                        </p>
                      )}
                    </div>
                  )}
                  {order.shipping.shippedAt && (
                    <div>
                      <p className="text-sm font-medium text-[var(--muted-foreground)]">
                        Odesláno
                      </p>
                      <p className="mt-1 text-sm">
                        {new Date(
                          order.shipping.shippedAt,
                        ).toLocaleDateString("cs-CZ")}
                      </p>
                    </div>
                  )}
                  {order.shipping.deliveredAt && (
                    <div>
                      <p className="text-sm font-medium text-[var(--muted-foreground)]">
                        Doručeno
                      </p>
                      <p className="mt-1 text-sm">
                        {new Date(
                          order.shipping.deliveredAt,
                        ).toLocaleDateString("cs-CZ")}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
