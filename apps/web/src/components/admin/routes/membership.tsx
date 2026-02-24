"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { t } from "@lingui/core/macro";
import { Crown, Loader2, Plus, Pencil } from "lucide-react";
import {
  membershipAdminApi,
  type MembershipPlan,
} from "@samofujera/api-client";
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Input,
  Label,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
} from "@samofujera/ui";
import { PageHeader } from "@/components/dashboard/page-header";

interface PlanFormData {
  name: string;
  slug: string;
  description: string;
  stripePriceIdCzk: string;
  stripePriceIdEur: string;
  features: string;
  sortOrder: number;
  active: boolean;
}

const emptyForm: PlanFormData = {
  name: "",
  slug: "",
  description: "",
  stripePriceIdCzk: "",
  stripePriceIdEur: "",
  features: "{}",
  sortOrder: 0,
  active: true,
};

export function MembershipPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<MembershipPlan | null>(null);
  const [form, setForm] = useState<PlanFormData>(emptyForm);

  const plansQuery = useQuery({
    queryKey: ["admin", "membership", "plans"],
    queryFn: () => membershipAdminApi.getPlans(),
  });

  const createMutation = useMutation({
    mutationFn: (data: PlanFormData) => {
      let features: Record<string, unknown> = {};
      try {
        features = JSON.parse(data.features);
      } catch {
        // keep empty
      }
      return membershipAdminApi.createPlan({
        name: data.name,
        slug: data.slug,
        description: data.description || undefined,
        stripePriceIdCzk: data.stripePriceIdCzk || undefined,
        stripePriceIdEur: data.stripePriceIdEur || undefined,
        features,
        sortOrder: data.sortOrder,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "membership", "plans"] });
      setDialogOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: PlanFormData }) => {
      let features: Record<string, unknown> = {};
      try {
        features = JSON.parse(data.features);
      } catch {
        // keep empty
      }
      return membershipAdminApi.updatePlan(id, {
        name: data.name,
        description: data.description || undefined,
        stripePriceIdCzk: data.stripePriceIdCzk || undefined,
        stripePriceIdEur: data.stripePriceIdEur || undefined,
        features,
        sortOrder: data.sortOrder,
        active: data.active,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "membership", "plans"] });
      setDialogOpen(false);
    },
  });

  const plans = plansQuery.data?.data ?? [];

  function openCreate() {
    setEditingPlan(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(plan: MembershipPlan) {
    setEditingPlan(plan);
    setForm({
      name: plan.name,
      slug: plan.slug,
      description: plan.description ?? "",
      stripePriceIdCzk: plan.stripePriceIdCzk ?? "",
      stripePriceIdEur: plan.stripePriceIdEur ?? "",
      features: JSON.stringify(plan.features ?? {}, null, 2),
      sortOrder: plan.sortOrder,
      active: plan.active,
    });
    setDialogOpen(true);
  }

  function handleSubmit() {
    if (editingPlan) {
      updateMutation.mutate({ id: editingPlan.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="flex flex-1 flex-col gap-4 sm:gap-6">
      <PageHeader
        title={t`Členství`}
        subtitle={t`Správa členských plánů a předplatného.`}
      >
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          {t`Nový plán`}
        </Button>
      </PageHeader>

      {plansQuery.isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : plansQuery.isError ? (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-6 text-center text-sm text-destructive">
          {t`Nepodařilo se načíst plány. Zkuste to prosím znovu.`}
        </div>
      ) : plans.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-md border border-dashed p-12">
          <Crown className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {t`Zatím nemáte žádné členské plány.`}
          </p>
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            {t`Vytvořit první plán`}
          </Button>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t`Název`}</TableHead>
              <TableHead>{t`Slug`}</TableHead>
              <TableHead>{t`Pořadí`}</TableHead>
              <TableHead>{t`Stav`}</TableHead>
              <TableHead>{t`Stripe Kč`}</TableHead>
              <TableHead>{t`Stripe EUR`}</TableHead>
              <TableHead className="w-[80px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {plans.map((plan) => (
              <TableRow key={plan.id}>
                <TableCell className="font-medium">{plan.name}</TableCell>
                <TableCell className="text-muted-foreground">{plan.slug}</TableCell>
                <TableCell>{plan.sortOrder}</TableCell>
                <TableCell>
                  <Badge variant={plan.active ? "default" : "secondary"}>
                    {plan.active ? t`Aktivní` : t`Neaktivní`}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {plan.stripePriceIdCzk || "-"}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {plan.stripePriceIdEur || "-"}
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => openEdit(plan)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingPlan ? t`Upravit plán` : t`Nový členský plán`}
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="plan-name">{t`Název`}</Label>
              <Input
                id="plan-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={t`Např. Premium`}
              />
            </div>

            {!editingPlan && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="plan-slug">{t`Slug`}</Label>
                <Input
                  id="plan-slug"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  placeholder={t`Např. premium`}
                />
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Label htmlFor="plan-description">{t`Popis`}</Label>
              <Textarea
                id="plan-description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="plan-price-czk">{t`Stripe Price ID (Kč)`}</Label>
                <Input
                  id="plan-price-czk"
                  value={form.stripePriceIdCzk}
                  onChange={(e) => setForm({ ...form, stripePriceIdCzk: e.target.value })}
                  placeholder="price_..."
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="plan-price-eur">{t`Stripe Price ID (EUR)`}</Label>
                <Input
                  id="plan-price-eur"
                  value={form.stripePriceIdEur}
                  onChange={(e) => setForm({ ...form, stripePriceIdEur: e.target.value })}
                  placeholder="price_..."
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="plan-features">{t`Funkce (JSON)`}</Label>
              <Textarea
                id="plan-features"
                value={form.features}
                onChange={(e) => setForm({ ...form, features: e.target.value })}
                rows={4}
                className="font-mono text-xs"
                placeholder='{"articles": "all", "video_library": true}'
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="plan-sort">{t`Pořadí`}</Label>
              <Input
                id="plan-sort"
                type="number"
                value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
              />
            </div>

            {editingPlan && (
              <div className="flex items-center gap-3">
                <Switch
                  id="plan-active"
                  checked={form.active}
                  onCheckedChange={(checked) => setForm({ ...form, active: checked })}
                />
                <Label htmlFor="plan-active">{t`Aktivní`}</Label>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t`Zrušit`}
            </Button>
            <Button onClick={handleSubmit} disabled={isPending || !form.name || !form.slug}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingPlan ? t`Uložit` : t`Vytvořit`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
