import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { adminApi } from "@samofujera/api-client";
import { Button, Input } from "@samofujera/ui";

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  DIGITAL: "Digitální",
  STREAMING: "Streaming",
  PHYSICAL: "Fyzický",
  EVENT: "Událost",
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Koncept",
  ACTIVE: "Aktivní",
  ARCHIVED: "Archivováno",
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  ACTIVE: "bg-green-100 text-green-700",
  ARCHIVED: "bg-red-100 text-red-700",
};

export function ProductsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [search, setSearch] = useState("");

  const productsQuery = useQuery({
    queryKey: ["admin", "products", { page, status: statusFilter, type: typeFilter, search }],
    queryFn: () =>
      adminApi.getProducts({
        page,
        limit: 20,
        status: statusFilter || undefined,
        type: typeFilter || undefined,
        search: search || undefined,
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteProduct(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
    },
  });

  function handleDelete(id: string, title: string) {
    if (window.confirm(`Opravdu chcete smazat produkt "${title}"?`)) {
      deleteMutation.mutate(id);
    }
  }

  const data = productsQuery.data?.data;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold">Produkty</h2>
        <Link to="/produkty/novy">
          <Button>Nový produkt</Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="mb-4 flex gap-3">
        <Input
          placeholder="Hledat..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="max-w-xs"
        />
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
        >
          <option value="">Všechny stavy</option>
          <option value="DRAFT">Koncept</option>
          <option value="ACTIVE">Aktivní</option>
          <option value="ARCHIVED">Archivováno</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
        >
          <option value="">Všechny typy</option>
          <option value="DIGITAL">Digitální</option>
          <option value="STREAMING">Streaming</option>
          <option value="PHYSICAL">Fyzický</option>
          <option value="EVENT">Událost</option>
        </select>
      </div>

      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)]">
        {productsQuery.isLoading && (
          <p className="p-6 text-[var(--muted-foreground)]">Načítání produktů...</p>
        )}

        {productsQuery.isError && (
          <p className="p-6 text-[var(--destructive)]">
            Nepodařilo se načíst produkty. Zkuste to prosím znovu.
          </p>
        )}

        {productsQuery.isSuccess && (
          <>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="px-4 py-3 font-medium text-[var(--muted-foreground)]">Název</th>
                  <th className="px-4 py-3 font-medium text-[var(--muted-foreground)]">Typ</th>
                  <th className="px-4 py-3 font-medium text-[var(--muted-foreground)]">Stav</th>
                  <th className="px-4 py-3 font-medium text-[var(--muted-foreground)]">Cena</th>
                  <th className="px-4 py-3 font-medium text-[var(--muted-foreground)]">Akce</th>
                </tr>
              </thead>
              <tbody>
                {data && data.items.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-[var(--muted-foreground)]" colSpan={5}>
                      Žádné produkty.
                    </td>
                  </tr>
                ) : (
                  data?.items.map((product) => (
                    <tr key={product.id} className="border-b border-[var(--border)] last:border-b-0">
                      <td className="px-4 py-3 font-medium">{product.title}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                          {PRODUCT_TYPE_LABELS[product.productType] ?? product.productType}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[product.status] ?? ""}`}
                        >
                          {STATUS_LABELS[product.status] ?? product.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {product.priceAmount} {product.priceCurrency}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Link to={`/produkty/${product.id}`}>
                            <Button variant="outline" size="sm">
                              Upravit
                            </Button>
                          </Link>
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={deleteMutation.isPending}
                            onClick={() => handleDelete(product.id, product.title)}
                          >
                            Smazat
                          </Button>
                        </div>
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
                  Stránka {data.page} z {data.totalPages} ({data.totalItems} produktů)
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
