import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { adminApi } from "@samofujera/api-client";
import { Button } from "@samofujera/ui";

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

export function OrdersPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");

  const ordersQuery = useQuery({
    queryKey: ["admin", "orders", { page, status: statusFilter }],
    queryFn: () =>
      adminApi.getOrders({
        page,
        limit: 20,
        status: statusFilter || undefined,
      }),
  });

  const data = ordersQuery.data?.data;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold">Objednávky</h2>
      </div>

      {/* Filters */}
      <div className="mb-4">
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
        >
          <option value="">Všechny stavy</option>
          <option value="PENDING">Čekající</option>
          <option value="PAID">Zaplaceno</option>
          <option value="CANCELLED">Zrušeno</option>
          <option value="REFUNDED">Vráceno</option>
        </select>
      </div>

      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)]">
        {ordersQuery.isLoading && (
          <p className="p-6 text-[var(--muted-foreground)]">Načítání objednávek...</p>
        )}

        {ordersQuery.isError && (
          <p className="p-6 text-[var(--destructive)]">
            Nepodařilo se načíst objednávky. Zkuste to prosím znovu.
          </p>
        )}

        {ordersQuery.isSuccess && (
          <>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="px-4 py-3 font-medium text-[var(--muted-foreground)]">ID</th>
                  <th className="px-4 py-3 font-medium text-[var(--muted-foreground)]">Stav</th>
                  <th className="px-4 py-3 font-medium text-[var(--muted-foreground)]">Celkem</th>
                  <th className="px-4 py-3 font-medium text-[var(--muted-foreground)]">Měna</th>
                  <th className="px-4 py-3 font-medium text-[var(--muted-foreground)]">Datum</th>
                  <th className="px-4 py-3 font-medium text-[var(--muted-foreground)]">Akce</th>
                </tr>
              </thead>
              <tbody>
                {data && data.items.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-[var(--muted-foreground)]" colSpan={6}>
                      Žádné objednávky.
                    </td>
                  </tr>
                ) : (
                  data?.items.map((order) => (
                    <tr key={order.id} className="border-b border-[var(--border)] last:border-b-0">
                      <td className="px-4 py-3 font-mono text-xs">
                        {order.id.substring(0, 8)}...
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[order.status] ?? ""}`}
                        >
                          {STATUS_LABELS[order.status] ?? order.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">{order.totalAmount}</td>
                      <td className="px-4 py-3">{order.currency}</td>
                      <td className="px-4 py-3">
                        {new Date(order.createdAt).toLocaleDateString("cs-CZ")}
                      </td>
                      <td className="px-4 py-3">
                        <Link to={`/objednavky/${order.id}`}>
                          <Button variant="outline" size="sm">
                            Detail
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Pagination */}
            {data && data.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-[var(--border)] px-4 py-3">
                <p className="text-sm text-[var(--muted-foreground)]">
                  Stránka {data.page} z {data.totalPages} ({data.totalItems} objednávek)
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Předchozí
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= data.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Další
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
