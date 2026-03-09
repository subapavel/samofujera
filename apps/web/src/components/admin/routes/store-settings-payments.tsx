"use client";

import { useState } from "react";
import { t } from "@lingui/core/macro";
import {
  Button,
  Badge,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from "@samofujera/ui";
import { Plus, Pencil, Search } from "lucide-react";
import { StoreSettingsLayout } from "../settings/store-settings-layout";

// --- Types ---

type PaymentMethodType =
  | "CASH"
  | "CASH_ON_DELIVERY"
  | "WIRE_TRANSFER"
  | "PAYPAL"
  | "GPWEBPAY"
  | "STRIPE";

interface PaymentMethod {
  id: string;
  name: string;
  type: PaymentMethodType;
  price: number;
  currency: string;
  active: boolean;
}

// --- Data ---

const PAYMENT_TYPES: { value: PaymentMethodType; label: string }[] = [
  { value: "CASH", label: "Hotově" },
  { value: "CASH_ON_DELIVERY", label: "Na dobírku" },
  { value: "WIRE_TRANSFER", label: "Bankovní převod" },
  { value: "PAYPAL", label: "PayPal" },
  { value: "GPWEBPAY", label: "GPWebPay" },
  { value: "STRIPE", label: "Stripe" },
];

const INITIAL_METHODS: PaymentMethod[] = [
  {
    id: "1",
    name: "Na dobírku (neposíláme audio a video záznam)",
    type: "CASH_ON_DELIVERY",
    price: 30,
    currency: "CZK",
    active: true,
  },
  {
    id: "2",
    name: "PayPal",
    type: "PAYPAL",
    price: 0,
    currency: "CZK",
    active: false,
  },
  {
    id: "3",
    name: "Bankovní převod",
    type: "WIRE_TRANSFER",
    price: 0,
    currency: "CZK",
    active: true,
  },
];

// --- Component ---

export function StoreSettingsPaymentsPage() {
  const [methods, setMethods] = useState<PaymentMethod[]>(INITIAL_METHODS);
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editMethod, setEditMethod] = useState<PaymentMethod | null>(null);

  // Add form
  const [newType, setNewType] = useState<PaymentMethodType>("CASH");
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("0");
  const [newActive, setNewActive] = useState(true);

  // Edit form
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editActive, setEditActive] = useState(true);

  const filteredMethods = methods.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  function formatPrice(price: number, currency: string) {
    return `${currency} ${price.toFixed(2)}`;
  }

  function handleOpenAdd() {
    setNewType("CASH");
    setNewName("");
    setNewPrice("0");
    setNewActive(true);
    setAddOpen(true);
  }

  function handleAdd() {
    const typeLabel =
      PAYMENT_TYPES.find((pt) => pt.value === newType)?.label ?? newType;
    const method: PaymentMethod = {
      id: String(Date.now()),
      name: newName || typeLabel,
      type: newType,
      price: parseFloat(newPrice) || 0,
      currency: "CZK",
      active: newActive,
    };
    setMethods((prev) => [...prev, method]);
    setAddOpen(false);
  }

  function handleOpenEdit(method: PaymentMethod) {
    setEditMethod(method);
    setEditName(method.name);
    setEditPrice(String(method.price));
    setEditActive(method.active);
  }

  function handleSaveEdit() {
    if (!editMethod) return;
    setMethods((prev) =>
      prev.map((m) =>
        m.id === editMethod.id
          ? {
              ...m,
              name: editName,
              price: parseFloat(editPrice) || 0,
              active: editActive,
            }
          : m
      )
    );
    setEditMethod(null);
  }

  function handleTypeChange(value: PaymentMethodType) {
    setNewType(value);
    const typeLabel = PAYMENT_TYPES.find((pt) => pt.value === value)?.label;
    if (typeLabel && !newName) {
      setNewName(typeLabel);
    }
  }

  return (
    <StoreSettingsLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{t`Platební metody`}</h3>
          <Button onClick={handleOpenAdd}>
            <Plus className="mr-2 h-4 w-4" />
            {t`Přidat metodu`}
          </Button>
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
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {t`Název`}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {t`Cena`}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {t`Stav`}
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {t`Akce`}
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredMethods.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-8 text-center text-sm text-muted-foreground"
                  >
                    {search
                      ? t`Žádné platební metody neodpovídají vyhledávání.`
                      : t`Zatím žádné platební metody.`}
                  </td>
                </tr>
              ) : (
                filteredMethods.map((method) => (
                  <tr
                    key={method.id}
                    className="border-b last:border-b-0 transition-colors hover:bg-muted/30"
                  >
                    <td className="px-4 py-4 text-sm font-medium">
                      {method.name}
                    </td>
                    <td className="px-4 py-4 text-sm text-muted-foreground">
                      {formatPrice(method.price, method.currency)}
                    </td>
                    <td className="px-4 py-4">
                      <Badge
                        variant={method.active ? "default" : "secondary"}
                        className={
                          method.active
                            ? "bg-green-500/15 text-green-700 hover:bg-green-500/25 dark:text-green-400"
                            : ""
                        }
                      >
                        {method.active ? t`Aktivní` : t`Neaktivní`}
                      </Badge>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => handleOpenEdit(method)}
                      >
                        <Pencil className="mr-1 h-3.5 w-3.5" />
                        {t`Upravit`}
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dialog: Add payment method */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t`Přidat platební metodu`}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t`Typ metody`}</Label>
              <Select
                value={newType}
                onValueChange={(v) =>
                  handleTypeChange(v as PaymentMethodType)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_TYPES.map((pt) => (
                    <SelectItem key={pt.value} value={pt.value}>
                      {pt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pay-name">{t`Název`}</Label>
              <Input
                id="pay-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={
                  PAYMENT_TYPES.find((pt) => pt.value === newType)?.label
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pay-price">{t`Příplatek (CZK)`}</Label>
              <Input
                id="pay-price"
                type="number"
                min="0"
                step="0.01"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="pay-active">{t`Aktivní`}</Label>
              <Switch
                id="pay-active"
                checked={newActive}
                onCheckedChange={setNewActive}
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

      {/* Dialog: Edit payment method */}
      <Dialog
        open={editMethod !== null}
        onOpenChange={(open) => {
          if (!open) setEditMethod(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t`Upravit platební metodu`}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-pay-name">{t`Název`}</Label>
              <Input
                id="edit-pay-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-pay-price">{t`Příplatek (CZK)`}</Label>
              <Input
                id="edit-pay-price"
                type="number"
                min="0"
                step="0.01"
                value={editPrice}
                onChange={(e) => setEditPrice(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="edit-pay-active">{t`Aktivní`}</Label>
              <Switch
                id="edit-pay-active"
                checked={editActive}
                onCheckedChange={setEditActive}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveEdit} disabled={!editName.trim()}>
              {t`Uložit`}
            </Button>
            <Button variant="outline" onClick={() => setEditMethod(null)}>
              {t`Zrušit`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </StoreSettingsLayout>
  );
}
