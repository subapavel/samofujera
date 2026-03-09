"use client";

import { useState } from "react";
import { t } from "@lingui/core/macro";
import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Input,
  Label,
} from "@samofujera/ui";
import { Plus, Search, Trash2 } from "lucide-react";
import { StoreSettingsLayout } from "../settings/store-settings-layout";

// --- Types ---

interface TaxRate {
  id: string;
  rate: number;
}

// --- Data ---

const INITIAL_RATES: TaxRate[] = [{ id: "1", rate: 21 }];

// --- Component ---

export function StoreSettingsTaxRatesPage() {
  const [rates, setRates] = useState<TaxRate[]>(INITIAL_RATES);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [addOpen, setAddOpen] = useState(false);
  const [newRate, setNewRate] = useState("0");

  const filteredRates = rates.filter((r) =>
    `${r.rate}%`.includes(search.toLowerCase())
  );

  const allSelected =
    filteredRates.length > 0 &&
    filteredRates.every((r) => selected.has(r.id));

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredRates.map((r) => r.id)));
    }
  }

  function handleOpenAdd() {
    setNewRate("0");
    setAddOpen(true);
  }

  function handleAdd() {
    const rate: TaxRate = {
      id: String(Date.now()),
      rate: parseFloat(newRate) || 0,
    };
    setRates((prev) => [...prev, rate]);
    setAddOpen(false);
  }

  function handleDeleteSelected() {
    setRates((prev) => prev.filter((r) => !selected.has(r.id)));
    setSelected(new Set());
  }

  return (
    <StoreSettingsLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{t`Daňové sazby`}</h3>
          <div className="flex gap-2">
            {selected.size > 0 && (
              <Button variant="destructive" onClick={handleDeleteSelected}>
                <Trash2 className="mr-2 h-4 w-4" />
                {t`Smazat vybrané`}
              </Button>
            )}
            <Button onClick={handleOpenAdd}>
              <Plus className="mr-2 h-4 w-4" />
              {t`Přidat sazbu`}
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t`Hledat...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Table */}
        <div className="rounded-lg border">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="w-12 px-4 py-3">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={toggleSelectAll}
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {t`Daňová sazba`}
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredRates.length === 0 ? (
                <tr>
                  <td
                    colSpan={2}
                    className="px-4 py-8 text-center text-sm text-muted-foreground"
                  >
                    {search
                      ? t`Žádné daňové sazby neodpovídají vyhledávání.`
                      : t`Zatím žádné daňové sazby.`}
                  </td>
                </tr>
              ) : (
                filteredRates.map((rate) => (
                  <tr
                    key={rate.id}
                    className="border-b last:border-b-0 transition-colors hover:bg-muted/30"
                  >
                    <td className="w-12 px-4 py-4">
                      <Checkbox
                        checked={selected.has(rate.id)}
                        onCheckedChange={() => toggleSelect(rate.id)}
                      />
                    </td>
                    <td className="px-4 py-4 text-sm font-medium">
                      {rate.rate}%
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dialog: Add tax rate */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t`Přidat daňovou sazbu`}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tax-rate">{t`Sazba (%)`}</Label>
              <Input
                id="tax-rate"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={newRate}
                onChange={(e) => setNewRate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleAdd}>
              {t`Přidat`}
            </Button>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              {t`Zrušit`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </StoreSettingsLayout>
  );
}
