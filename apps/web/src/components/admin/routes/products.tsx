"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { t } from "@lingui/core/macro";
import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import type { MessageDescriptor } from "@lingui/core";
import { adminApi } from "@samofujera/api-client";
import type { ProductType } from "@samofujera/api-client";
import {
  Button,
  Input,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@samofujera/ui";

const PRODUCT_TYPE_LABELS: Record<string, MessageDescriptor> = {
  PHYSICAL: msg`Fyzický`,
  EBOOK: msg`E-book`,
  AUDIO_VIDEO: msg`Audio/Video`,
  ONLINE_EVENT: msg`Online událost`,
  RECURRING_EVENT: msg`Opakovaná událost`,
  OFFLINE_EVENT: msg`Offline událost`,
};

const PRODUCT_TYPES: Array<{ value: ProductType; label: MessageDescriptor }> = [
  { value: "PHYSICAL", label: msg`Fyzický produkt` },
  { value: "EBOOK", label: msg`E-book` },
  { value: "AUDIO_VIDEO", label: msg`Audio/Video` },
  { value: "ONLINE_EVENT", label: msg`Online událost` },
  { value: "RECURRING_EVENT", label: msg`Opakovaná událost` },
  { value: "OFFLINE_EVENT", label: msg`Offline událost` },
];

const STATUS_LABELS: Record<string, MessageDescriptor> = {
  DRAFT: msg`Draft`,
  ACTIVE: msg`Publikováno`,
  ARCHIVED: msg`Archivováno`,
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  ACTIVE: "bg-green-100 text-green-700",
  ARCHIVED: "bg-red-100 text-red-700",
};

function formatPrices(prices: Record<string, number>): string {
  const entries = Object.entries(prices);
  if (entries.length === 0) return "--";
  return entries.map(([currency, amount]) => `${amount} ${currency}`).join(" / ");
}

export function ProductsPage() {
  const { _ } = useLingui();
  const router = useRouter();
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

  const createDraftMutation = useMutation({
    mutationFn: (productType: string) => adminApi.createDraft(productType),
    onSuccess: (response) => {
      router.push(`/admin/produkty/${response.data.id}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteProduct(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
    },
  });

  function handleDelete(id: string, title: string) {
    if (window.confirm(t`Opravdu chcete smazat produkt "${title}"?`)) {
      deleteMutation.mutate(id);
    }
  }

  const data = productsQuery.data?.data;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold">{t`Produkty`}</h2>
        <div className="flex">
          <Link href="/admin/produkty/novy">
            <Button className="rounded-r-none">{t`Nový produkt`}</Button>
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="rounded-l-none border-l border-l-[var(--primary-foreground)]/20 px-2">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 5L6 8L9 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {PRODUCT_TYPES.map((pt) => (
                <DropdownMenuItem
                  key={pt.value}
                  disabled={createDraftMutation.isPending}
                  onClick={() => createDraftMutation.mutate(pt.value)}
                >
                  {_(pt.label)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex gap-3">
        <Input
          placeholder={t`Hledat...`}
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
          <option value="">{t`Všechny stavy`}</option>
          <option value="DRAFT">{t`Draft`}</option>
          <option value="ACTIVE">{t`Publikováno`}</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
        >
          <option value="">{t`Všechny typy`}</option>
          <option value="PHYSICAL">{t`Fyzický`}</option>
          <option value="EBOOK">{t`E-book`}</option>
          <option value="AUDIO_VIDEO">{t`Audio/Video`}</option>
          <option value="ONLINE_EVENT">{t`Online událost`}</option>
          <option value="RECURRING_EVENT">{t`Opakovaná událost`}</option>
          <option value="OFFLINE_EVENT">{t`Offline událost`}</option>
        </select>
      </div>

      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)]">
        {productsQuery.isLoading && (
          <p className="p-6 text-[var(--muted-foreground)]">{t`Načítání produktů...`}</p>
        )}

        {productsQuery.isError && (
          <p className="p-6 text-[var(--destructive)]">
            {t`Nepodařilo se načíst produkty. Zkuste to prosím znovu.`}
          </p>
        )}

        {productsQuery.isSuccess && (
          <>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="px-4 py-3 font-medium text-[var(--muted-foreground)]">{t`Název`}</th>
                  <th className="px-4 py-3 font-medium text-[var(--muted-foreground)]">{t`Typ`}</th>
                  <th className="px-4 py-3 font-medium text-[var(--muted-foreground)]">{t`Stav`}</th>
                  <th className="px-4 py-3 font-medium text-[var(--muted-foreground)]">{t`Cena`}</th>
                  <th className="px-4 py-3 font-medium text-[var(--muted-foreground)]">{t`Akce`}</th>
                </tr>
              </thead>
              <tbody>
                {data && data.items.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-[var(--muted-foreground)]" colSpan={5}>
                      {t`Žádné produkty.`}
                    </td>
                  </tr>
                ) : (
                  data?.items.map((product) => (
                    <tr key={product.id} className="border-b border-[var(--border)] last:border-b-0">
                      <td className="px-4 py-3 font-medium">{product.title}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                          {_(PRODUCT_TYPE_LABELS[product.productType]) ?? product.productType}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[product.status] ?? ""}`}
                        >
                          {_(STATUS_LABELS[product.status]) ?? product.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {formatPrices(product.prices)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Link href={`/admin/produkty/${product.id}`}>
                            <Button variant="outline" size="sm">
                              {t`Upravit`}
                            </Button>
                          </Link>
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={deleteMutation.isPending}
                            onClick={() => handleDelete(product.id, product.title)}
                          >
                            {t`Smazat`}
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
                  {t`Stránka ${data.page} z ${data.totalPages} (${data.totalItems} produktů)`}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    {t`Předchozí`}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= data.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    {t`Další`}
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
