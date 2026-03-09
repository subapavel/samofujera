"use client";

import { useState } from "react";
import { t } from "@lingui/core/macro";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from "@samofujera/ui";
import { Plus, MoreHorizontal } from "lucide-react";
import { StoreSettingsLayout } from "../settings/store-settings-layout";

// --- Types ---

interface Currency {
  id: string;
  code: string;
  symbol: string;
  name: string;
  isDefault: boolean;
  priceFormat?: string;
  conversionRate?: number;
  customerPayIn: "this" | "default";
  displayInStore: boolean;
}

// --- Data ---

const AVAILABLE_CURRENCIES = [
  { code: "CZK", symbol: "Kč", name: "Czech Koruna" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "PLN", symbol: "zł", name: "Polish Zloty" },
  { code: "HUF", symbol: "Ft", name: "Hungarian Forint" },
  { code: "CHF", symbol: "CHF", name: "Swiss Franc" },
];

const INITIAL_CURRENCIES: Currency[] = [
  {
    id: "1",
    code: "CZK",
    symbol: "Kč",
    name: "Czech Koruna",
    isDefault: true,
    priceFormat: "321.00 Kč",
    customerPayIn: "this",
    displayInStore: true,
  },
  {
    id: "2",
    code: "EUR",
    symbol: "€",
    name: "Euro",
    isDefault: false,
    conversionRate: 0.042,
    customerPayIn: "this",
    displayInStore: false,
  },
];

// --- Component ---

export function StoreSettingsCurrenciesPage() {
  const [currencies, setCurrencies] =
    useState<Currency[]>(INITIAL_CURRENCIES);
  const [addOpen, setAddOpen] = useState(false);
  const [editCurrency, setEditCurrency] = useState<Currency | null>(null);

  // Add form
  const [newCode, setNewCode] = useState("");
  const [newRate, setNewRate] = useState("1");
  const [newPayIn, setNewPayIn] = useState<"this" | "default">("this");
  const [newDisplay, setNewDisplay] = useState(true);

  // Edit form
  const [editRate, setEditRate] = useState("");
  const [editPayIn, setEditPayIn] = useState<"this" | "default">("this");
  const [editDisplay, setEditDisplay] = useState(true);

  const defaultCurrency = currencies.find((c) => c.isDefault);
  const otherCurrencies = currencies.filter((c) => !c.isDefault);

  function handleOpenAdd() {
    const usedCodes = currencies.map((c) => c.code);
    const firstAvailable = AVAILABLE_CURRENCIES.find(
      (c) => !usedCodes.includes(c.code)
    );
    setNewCode(firstAvailable?.code ?? "");
    setNewRate("1");
    setNewPayIn("this");
    setNewDisplay(true);
    setAddOpen(true);
  }

  function handleAdd() {
    const info = AVAILABLE_CURRENCIES.find((c) => c.code === newCode);
    if (!info) return;
    const currency: Currency = {
      id: String(Date.now()),
      code: info.code,
      symbol: info.symbol,
      name: info.name,
      isDefault: false,
      conversionRate: parseFloat(newRate) || 1,
      customerPayIn: newPayIn,
      displayInStore: newDisplay,
    };
    setCurrencies((prev) => [...prev, currency]);
    setAddOpen(false);
  }

  function handleOpenEdit(currency: Currency) {
    setEditCurrency(currency);
    setEditRate(String(currency.conversionRate ?? 1));
    setEditPayIn(currency.customerPayIn);
    setEditDisplay(currency.displayInStore);
  }

  function handleSaveEdit() {
    if (!editCurrency) return;
    setCurrencies((prev) =>
      prev.map((c) =>
        c.id === editCurrency.id
          ? {
              ...c,
              conversionRate: parseFloat(editRate) || 1,
              customerPayIn: editPayIn,
              displayInStore: editDisplay,
            }
          : c
      )
    );
    setEditCurrency(null);
  }

  function handleDelete(id: string) {
    setCurrencies((prev) => prev.filter((c) => c.id !== id));
  }

  function handleSetDefault(id: string) {
    setCurrencies((prev) =>
      prev.map((c) => ({
        ...c,
        isDefault: c.id === id,
        conversionRate: c.id === id ? undefined : c.conversionRate,
        priceFormat: c.id === id ? `321.00 ${c.symbol}` : undefined,
      }))
    );
  }

  function toggleDisplay(id: string, value: boolean) {
    setCurrencies((prev) =>
      prev.map((c) => (c.id === id ? { ...c, displayInStore: value } : c))
    );
  }

  function formatCurrencyLabel(c: { code: string; symbol: string; name: string }) {
    return `${c.code} - ${c.symbol} - ${c.name}`;
  }

  return (
    <StoreSettingsLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{t`Měny`}</h3>
          <Button onClick={handleOpenAdd}>
            <Plus className="mr-2 h-4 w-4" />
            {t`Přidat měnu`}
          </Button>
        </div>

        <p className="text-sm text-muted-foreground">
          {t`Přidejte měny, které chcete zobrazit v obchodě, a vyberte, ve které měně budou zákazníci platit.`}
        </p>

        {/* Default currency */}
        {defaultCurrency && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">{t`Výchozí měna`}</h4>
            <div className="rounded-lg border">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {t`Měna`}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {t`Formát ceny`}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {t`Akce`}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-4 py-4 text-sm font-medium">
                      {formatCurrencyLabel(defaultCurrency)}
                    </td>
                    <td className="px-4 py-4 text-sm text-muted-foreground">
                      {defaultCurrency.priceFormat}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">
                            <MoreHorizontal className="mr-1 h-3.5 w-3.5" />
                            {t`Více`}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleOpenEdit(defaultCurrency)}
                          >
                            {t`Upravit`}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Other currencies */}
        {otherCurrencies.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">{t`Ostatní měny`}</h4>
            <div className="rounded-lg border">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {t`Měna`}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {t`Kurz`}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {t`Zákazník platí v`}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {t`Zobrazit v obchodě`}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {t`Akce`}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {otherCurrencies.map((currency) => (
                    <tr
                      key={currency.id}
                      className="border-b last:border-b-0 transition-colors hover:bg-muted/30"
                    >
                      <td className="px-4 py-4 text-sm font-medium">
                        {formatCurrencyLabel(currency)}
                      </td>
                      <td className="px-4 py-4 text-sm text-muted-foreground">
                        {currency.conversionRate}
                      </td>
                      <td className="px-4 py-4 text-sm text-muted-foreground">
                        {currency.customerPayIn === "this"
                          ? t`Tato měna (${currency.code})`
                          : t`Výchozí měna (${defaultCurrency?.code ?? ""})`}
                      </td>
                      <td className="px-4 py-4">
                        <Switch
                          checked={currency.displayInStore}
                          onCheckedChange={(v) => toggleDisplay(currency.id, v)}
                        />
                      </td>
                      <td className="px-4 py-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                              <MoreHorizontal className="mr-1 h-3.5 w-3.5" />
                              {t`Více`}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleOpenEdit(currency)}
                            >
                              {t`Upravit`}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleSetDefault(currency.id)}
                            >
                              {t`Nastavit jako výchozí`}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDelete(currency.id)}
                            >
                              {t`Odstranit`}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Dialog: Add currency */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t`Přidat měnu`}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t`Měna`}</Label>
              <Select value={newCode} onValueChange={setNewCode}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_CURRENCIES.filter(
                    (ac) => !currencies.some((c) => c.code === ac.code)
                  ).map((ac) => (
                    <SelectItem key={ac.code} value={ac.code}>
                      {formatCurrencyLabel(ac)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-rate">{t`Kurz`}</Label>
              <Input
                id="new-rate"
                type="number"
                min="0"
                step="0.001"
                value={newRate}
                onChange={(e) => setNewRate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t`Zákazník platí v`}</Label>
              <Select
                value={newPayIn}
                onValueChange={(v) => setNewPayIn(v as "this" | "default")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="this">{t`Tato měna`}</SelectItem>
                  <SelectItem value="default">{t`Výchozí měna (${defaultCurrency?.code ?? ""})`}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="new-display">{t`Zobrazit v obchodě`}</Label>
              <Switch
                id="new-display"
                checked={newDisplay}
                onCheckedChange={setNewDisplay}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleAdd} disabled={!newCode}>
              {t`Přidat`}
            </Button>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              {t`Zrušit`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Edit currency */}
      <Dialog
        open={editCurrency !== null}
        onOpenChange={(open) => {
          if (!open) setEditCurrency(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {t`Upravit měnu`} — {editCurrency?.code ?? ""}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {!editCurrency?.isDefault && (
              <div className="space-y-2">
                <Label htmlFor="edit-rate">{t`Kurz`}</Label>
                <Input
                  id="edit-rate"
                  type="number"
                  min="0"
                  step="0.001"
                  value={editRate}
                  onChange={(e) => setEditRate(e.target.value)}
                />
              </div>
            )}
            {!editCurrency?.isDefault && (
              <div className="space-y-2">
                <Label>{t`Zákazník platí v`}</Label>
                <Select
                  value={editPayIn}
                  onValueChange={(v) =>
                    setEditPayIn(v as "this" | "default")
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="this">{t`Tato měna (${editCurrency?.code ?? ""})`}</SelectItem>
                    <SelectItem value="default">{t`Výchozí měna (${defaultCurrency?.code ?? ""})`}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex items-center justify-between">
              <Label htmlFor="edit-display">{t`Zobrazit v obchodě`}</Label>
              <Switch
                id="edit-display"
                checked={editDisplay}
                onCheckedChange={setEditDisplay}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveEdit}>
              {t`Uložit`}
            </Button>
            <Button variant="outline" onClick={() => setEditCurrency(null)}>
              {t`Zrušit`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </StoreSettingsLayout>
  );
}
