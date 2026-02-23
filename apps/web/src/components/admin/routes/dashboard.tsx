"use client";

import { t } from "@lingui/core/macro";
import { DollarSign, ShoppingCart, Package, Users } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@samofujera/ui";
import { PageHeader } from "@/components/dashboard/page-header";

interface StatCardProps {
  title: string;
  value: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

function StatCard({ title, value, description, icon: Icon }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

export function DashboardPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 sm:gap-6">
      <PageHeader
        title={t`Nástěnka`}
        subtitle={t`Přehled vašeho obchodu.`}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t`Celkové tržby`}
          value="0 Kč"
          description={t`Zatím žádné tržby`}
          icon={DollarSign}
        />
        <StatCard
          title={t`Objednávky`}
          value="0"
          description={t`Zatím žádné objednávky`}
          icon={ShoppingCart}
        />
        <StatCard
          title={t`Produkty`}
          value="0"
          description={t`Zatím žádné produkty`}
          icon={Package}
        />
        <StatCard
          title={t`Aktivní uživatelé`}
          value="0"
          description={t`Zatím žádní uživatelé`}
          icon={Users}
        />
      </div>
    </div>
  );
}
