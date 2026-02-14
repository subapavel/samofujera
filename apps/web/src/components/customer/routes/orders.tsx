import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { ordersApi } from "@samofujera/api-client";
import { Button } from "@samofujera/ui";

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

export function OrdersPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const limit = 10;

  const ordersQuery = useQuery({
    queryKey: ["orders", page, limit],
    queryFn: () => ordersApi.getMyOrders({ page, limit }),
  });

  const data = ordersQuery.data?.data;

  return (
    <div>
      <h2 className="mb-4 text-2xl font-bold">Objednávky</h2>

      {ordersQuery.isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-12 animate-pulse rounded-lg border border-[var(--border)] bg-[var(--card)]"
            />
          ))}
        </div>
      )}

      {ordersQuery.isError && (
        <p className="text-[var(--destructive)]">
          Nepodařilo se načíst objednávky. Zkuste to prosím znovu.
        </p>
      )}

      {ordersQuery.isSuccess && data && (
        <>
          {data.items.length === 0 ? (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
              <p className="text-[var(--muted-foreground)]">
                Zatím nemáte žádné objednávky.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-hidden rounded-lg border border-[var(--border)]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-[var(--card)]">
                      <th className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">
                        Objednávka
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">
                        Stav
                      </th>
                      <th className="px-4 py-3 text-right font-medium text-[var(--muted-foreground)]">
                        Celkem
                      </th>
                      <th className="px-4 py-3 text-right font-medium text-[var(--muted-foreground)]">
                        Datum
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((order) => {
                      const status = statusConfig[order.status] ?? {
                        label: order.status,
                        className: "bg-gray-100 text-gray-600",
                      };
                      return (
                        <tr
                          key={order.id}
                          className="cursor-pointer border-b border-[var(--border)] transition-colors last:border-b-0 hover:bg-[var(--accent)]"
                          onClick={() =>
                            void navigate({
                              to: `/objednavky/${order.id}`,
                            })
                          }
                        >
                          <td className="px-4 py-3 font-mono text-xs">
                            {order.id.slice(0, 8)}...
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${status.className}`}
                            >
                              {status.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {formatPrice(order.totalAmount, order.currency)}
                          </td>
                          <td className="px-4 py-3 text-right text-[var(--muted-foreground)]">
                            {new Date(order.createdAt).toLocaleDateString(
                              "cs-CZ",
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {data.totalPages > 1 && (
                <div className="mt-4 flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Předchozí
                  </Button>
                  <span className="text-sm text-[var(--muted-foreground)]">
                    Strana {data.page} z {data.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= data.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Další
                  </Button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
