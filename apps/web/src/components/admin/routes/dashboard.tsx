"use client";

import { t } from "@lingui/core/macro";
import { useQuery } from "@tanstack/react-query";
import {
  DollarSign,
  ShoppingCart,
  Package,
  Users,
  FileText,
  Mail,
  Plus,
  ArrowRight,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
} from "@samofujera/ui";
import Link from "next/link";
import { StatCard } from "@/components/dashboard/stat-card";
import { StatCardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { EmptyState } from "@/components/dashboard/empty-state";
import { adminApi } from "@samofujera/api-client";

export function DashboardPage() {
  const productsQuery = useQuery({
    queryKey: ["admin", "products", { limit: 1 }],
    queryFn: () => adminApi.getProducts({ limit: 1 }),
  });

  const ordersQuery = useQuery({
    queryKey: ["admin", "orders", { limit: 5 }],
    queryFn: () => adminApi.getOrders({ limit: 5 }),
  });

  const productCount = productsQuery.data?.data?.totalItems ?? 0;
  const recentOrders = ordersQuery.data?.data?.items ?? [];
  const orderCount = ordersQuery.data?.data?.totalItems ?? 0;

  const isLoading = productsQuery.isLoading || ordersQuery.isLoading;

  return (
    <div className="flex flex-1 flex-col gap-6">
      {/* Welcome banner */}
      <div className="rounded-lg bg-warm p-6">
        <h1 className="font-heading text-xl font-semibold text-warm-foreground">
          {t`Vítejte zpět`}
        </h1>
        <p className="mt-1 text-sm text-warm-foreground/70">
          {t`Zde je přehled vašeho obchodu.`}
        </p>
      </div>

      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard
              title={t`Celkové tržby`}
              value="0 Kč"
              description={t`Zatím žádné tržby`}
              icon={<DollarSign className="h-5 w-5" />}
              variant="warm"
            />
            <StatCard
              title={t`Objednávky`}
              value={String(orderCount)}
              description={t`Celkem objednávek`}
              icon={<ShoppingCart className="h-5 w-5" />}
            />
            <StatCard
              title={t`Produkty`}
              value={String(productCount)}
              description={t`Aktivních produktů`}
              icon={<Package className="h-5 w-5" />}
              variant="success"
            />
            <StatCard
              title={t`Uživatelé`}
              value="—"
              description={t`Registrovaných`}
              icon={<Users className="h-5 w-5" />}
            />
          </>
        )}
      </div>

      {/* Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="font-heading text-base font-semibold">{t`Poslední objednávky`}</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/objednavky">
                {t`Zobrazit vše`}
                <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {ordersQuery.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between rounded-md border p-3">
                    <div className="space-y-1">
                      <div className="h-4 w-24 animate-pulse rounded bg-accent" />
                      <div className="h-3 w-16 animate-pulse rounded bg-accent" />
                    </div>
                    <div className="h-5 w-16 animate-pulse rounded bg-accent" />
                  </div>
                ))}
              </div>
            ) : recentOrders.length === 0 ? (
              <EmptyState
                icon={<ShoppingCart className="h-6 w-6" />}
                title={t`Zatím žádné objednávky`}
                description={t`Objednávky se zobrazí, jakmile přijde první nákup.`}
                className="py-8"
              />
            ) : (
              <div className="space-y-2">
                {recentOrders.map((order) => (
                  <Link
                    key={order.id}
                    href={`/admin/objednavky/${order.id}`}
                    className="flex items-center justify-between rounded-md border p-3 transition-colors hover:bg-accent/50"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {order.items[0]?.productTitle ?? t`Objednávka`}
                        {order.items.length > 1 && ` +${order.items.length - 1}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(order.createdAt).toLocaleDateString("cs-CZ")}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium">{order.totalAmount} Kč</span>
                      <StatusBadge status={order.status} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="font-heading text-base font-semibold">{t`Rychlé akce`}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <QuickAction
                href="/admin/produkty"
                icon={<Plus className="h-4 w-4" />}
                label={t`Nový produkt`}
              />
              <QuickAction
                href="/admin/stranky/nova"
                icon={<FileText className="h-4 w-4" />}
                label={t`Nová stránka`}
              />
              <QuickAction
                href="/admin/objednavky"
                icon={<ShoppingCart className="h-4 w-4" />}
                label={t`Objednávky`}
              />
              <QuickAction
                href="/admin/emaily"
                icon={<Mail className="h-4 w-4" />}
                label={t`Emaily`}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function QuickAction({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent/50"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        {icon}
      </div>
      <span className="text-sm font-medium">{label}</span>
    </Link>
  );
}
