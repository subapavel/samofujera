"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { t } from "@lingui/core/macro";
import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import type { MessageDescriptor } from "@lingui/core";
import { ArrowLeft, Loader2 } from "lucide-react";
import { ordersApi } from "@samofujera/api-client";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@samofujera/ui";

const STATUS_LABELS: Record<string, MessageDescriptor> = {
  PENDING: msg`Čeká na platbu`,
  PAID: msg`Zaplaceno`,
  SHIPPED: msg`Odesláno`,
  CANCELLED: msg`Zrušeno`,
  REFUNDED: msg`Vráceno`,
};

const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  PENDING: "outline",
  PAID: "default",
  SHIPPED: "secondary",
  CANCELLED: "destructive",
  REFUNDED: "destructive",
};

function formatPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat("cs-CZ", {
    style: "currency",
    currency,
  }).format(amount / 100);
}

export function OrderDetailPage() {
  const { _ } = useLingui();
  const params = useParams();
  const orderId = params.orderId as string;
  const router = useRouter();

  const orderQuery = useQuery({
    queryKey: ["orders", orderId],
    queryFn: () => ordersApi.getOrder(orderId),
    enabled: Boolean(orderId),
  });

  const order = orderQuery.data?.data;

  if (orderQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (orderQuery.isError) {
    return (
      <div className="rounded-md border border-destructive/50 bg-destructive/10 p-6 text-center text-sm text-destructive">
        {t`Nepodařilo se načíst objednávku. Zkuste to prosím znovu.`}
      </div>
    );
  }

  if (!order) {
    return (
      <p className="text-muted-foreground">{t`Objednávka nenalezena.`}</p>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 sm:gap-6">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/muj-ucet/objednavky")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t`Zpět`}
        </Button>
        <h2 className="text-2xl font-bold tracking-tight">{t`Detail objednávky`}</h2>
      </div>

      {/* Order Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t`Objednávka`}</CardTitle>
              <CardDescription className="font-mono text-xs">
                {order.id}
              </CardDescription>
            </div>
            <Badge variant={STATUS_VARIANT[order.status] ?? "outline"}>
              {_(STATUS_LABELS[order.status]) ?? order.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
            <div>
              <p className="font-medium text-muted-foreground">{t`Datum`}</p>
              <p>{new Date(order.createdAt).toLocaleDateString("cs-CZ")}</p>
            </div>
            <div>
              <p className="font-medium text-muted-foreground">{t`Celkem`}</p>
              <p className="text-lg font-semibold">
                {formatPrice(order.totalAmount, order.currency)}
              </p>
            </div>
            {order.discountAmount > 0 && (
              <div>
                <p className="font-medium text-muted-foreground">{t`Sleva`}</p>
                <p>-{formatPrice(order.discountAmount, order.currency)}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Order Items */}
      <Card>
        <CardHeader>
          <CardTitle>{t`Položky`}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t`Produkt`}</TableHead>
                <TableHead className="text-right">{t`Množství`}</TableHead>
                <TableHead className="text-right">{t`Cena`}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    {item.productTitle}
                  </TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right">
                    {formatPrice(item.totalPrice, order.currency)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Shipping Info (read-only) */}
      {order.shipping && (
        <Card>
          <CardHeader>
            <CardTitle>{t`Doručení`}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
              {order.shipping.carrier && (
                <div>
                  <p className="font-medium text-muted-foreground">
                    {t`Dopravce`}
                  </p>
                  <p>{order.shipping.carrier}</p>
                </div>
              )}
              {order.shipping.trackingNumber && (
                <div>
                  <p className="font-medium text-muted-foreground">
                    {t`Sledovací číslo`}
                  </p>
                  {order.shipping.trackingUrl ? (
                    <a
                      href={order.shipping.trackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline"
                    >
                      {order.shipping.trackingNumber}
                    </a>
                  ) : (
                    <p>{order.shipping.trackingNumber}</p>
                  )}
                </div>
              )}
              {order.shipping.shippedAt && (
                <div>
                  <p className="font-medium text-muted-foreground">
                    {t`Odesláno`}
                  </p>
                  <p>
                    {new Date(order.shipping.shippedAt).toLocaleDateString(
                      "cs-CZ",
                    )}
                  </p>
                </div>
              )}
              {order.shipping.deliveredAt && (
                <div>
                  <p className="font-medium text-muted-foreground">
                    {t`Doručeno`}
                  </p>
                  <p>
                    {new Date(order.shipping.deliveredAt).toLocaleDateString(
                      "cs-CZ",
                    )}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
