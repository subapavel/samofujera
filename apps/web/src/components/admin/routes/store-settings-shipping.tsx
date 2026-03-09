"use client";

import { useState } from "react";
import { t } from "@lingui/core/macro";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  Input,
  Label,
  Separator,
} from "@samofujera/ui";
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Package,
  Store,
  Truck,
} from "lucide-react";
import { StoreSettingsLayout } from "../settings/store-settings-layout";

// --- Types ---

interface ShippingMethod {
  id: string;
  name: string;
  price: number;
  currency: string;
}

interface ShippingArea {
  id: string;
  countryCode: string;
  countryName: string;
  flag: string;
  methods: ShippingMethod[];
}

interface CarrierOption {
  id: string;
  name: string;
}

// --- Data ---

const CARRIERS_BY_COUNTRY: Record<string, CarrierOption[]> = {
  CZ: [
    { id: "ceska-posta", name: "Česká pošta" },
    { id: "dpd", name: "DPD" },
    { id: "gls", name: "GLS" },
    { id: "ppl", name: "PPL" },
    { id: "zasilkovna", name: "Zásilkovna" },
    { id: "pickup", name: t`Osobní odběr` },
    { id: "other", name: t`Jiný způsob dopravy` },
  ],
  SK: [
    { id: "slovenska-posta", name: "Slovenská pošta" },
    { id: "dhl", name: "DHL" },
    { id: "dpd", name: "DPD" },
    { id: "gls", name: "GLS" },
    { id: "zasilkovna", name: "Zásilkovna" },
    { id: "pickup", name: t`Osobní odběr` },
    { id: "other", name: t`Jiný způsob dopravy` },
  ],
  DE: [
    { id: "dhl-group", name: "Deutsche Post - DHL Group" },
    { id: "dpd", name: "DPD" },
    { id: "gls", name: "GLS" },
    { id: "hermes", name: "Hermes" },
    { id: "ups", name: "UPS" },
    { id: "pickup", name: t`Osobní odběr` },
    { id: "other", name: t`Jiný způsob dopravy` },
  ],
};

const DEFAULT_CARRIERS: CarrierOption[] = [
  { id: "dhl", name: "DHL" },
  { id: "dpd", name: "DPD" },
  { id: "gls", name: "GLS" },
  { id: "ups", name: "UPS" },
  { id: "pickup", name: t`Osobní odběr` },
  { id: "other", name: t`Jiný způsob dopravy` },
];

const COUNTRY_FLAGS: Record<string, string> = {
  CZ: "\u{1F1E8}\u{1F1FF}",
  SK: "\u{1F1F8}\u{1F1F0}",
  DE: "\u{1F1E9}\u{1F1EA}",
  PL: "\u{1F1F5}\u{1F1F1}",
  AT: "\u{1F1E6}\u{1F1F9}",
  HU: "\u{1F1ED}\u{1F1FA}",
};

const AVAILABLE_COUNTRIES = [
  { code: "CZ", name: t`Česko` },
  { code: "SK", name: t`Slovensko` },
  { code: "DE", name: t`Německo` },
  { code: "PL", name: t`Polsko` },
  { code: "AT", name: t`Rakousko` },
  { code: "HU", name: t`Maďarsko` },
];

const INITIAL_AREAS: ShippingArea[] = [
  {
    id: "cz",
    countryCode: "CZ",
    countryName: "Česko",
    flag: COUNTRY_FLAGS.CZ,
    methods: [
      { id: "cz-1", name: "Osobní odběr", price: 0, currency: "CZK" },
      {
        id: "cz-2",
        name: "Česká pošta (neposíláme audio ani video)",
        price: 150,
        currency: "CZK",
      },
      {
        id: "cz-3",
        name: "Stažení produktu v audio/video formátu",
        price: 0,
        currency: "CZK",
      },
      {
        id: "cz-4",
        name: "Zaslání dárkového poukazu e-mailem",
        price: 0,
        currency: "CZK",
      },
      {
        id: "cz-5",
        name: "Česká pošta (dárkový poukaz)",
        price: 60,
        currency: "CZK",
      },
      { id: "cz-6", name: "Zásilkovna", price: 99, currency: "CZK" },
    ],
  },
  {
    id: "sk",
    countryCode: "SK",
    countryName: "Slovensko",
    flag: COUNTRY_FLAGS.SK,
    methods: [
      {
        id: "sk-1",
        name: "Slovenská pošta (nezasíláme audio ani video)",
        price: 200,
        currency: "CZK",
      },
      {
        id: "sk-2",
        name: "Stažení produktu v audio/video formátu",
        price: 0,
        currency: "CZK",
      },
      {
        id: "sk-3",
        name: "Zaslání dárkového poukazu e-mailem",
        price: 0,
        currency: "CZK",
      },
      {
        id: "sk-4",
        name: "Slovenská pošta (dárkový poukaz)",
        price: 100,
        currency: "CZK",
      },
      { id: "sk-5", name: "Zásilkovna", price: 108, currency: "CZK" },
    ],
  },
  {
    id: "de",
    countryCode: "DE",
    countryName: "Německo",
    flag: COUNTRY_FLAGS.DE,
    methods: [
      {
        id: "de-1",
        name: "Deutsche Post - DHL Group (nezasílám audio ani video)",
        price: 350,
        currency: "CZK",
      },
      {
        id: "de-2",
        name: "Stažení produktu v audio/video formátu",
        price: 0,
        currency: "CZK",
      },
      {
        id: "de-3",
        name: "Zaslání dárkového poukazu e-mailem",
        price: 0,
        currency: "CZK",
      },
    ],
  },
];

// --- Component ---

export function StoreSettingsShippingPage() {
  const [areas, setAreas] = useState<ShippingArea[]>(INITIAL_AREAS);
  const [addMethodAreaId, setAddMethodAreaId] = useState<string | null>(null);
  const [selectedCarrier, setSelectedCarrier] = useState<string | null>(null);
  const [addAreaOpen, setAddAreaOpen] = useState(false);

  // Add method step 2: configure name + price
  const [configureMethod, setConfigureMethod] = useState<{
    areaId: string;
    carrierName: string;
  } | null>(null);
  const [newMethodName, setNewMethodName] = useState("");
  const [newMethodPrice, setNewMethodPrice] = useState("");

  // Edit method
  const [editMethod, setEditMethod] = useState<{
    areaId: string;
    method: ShippingMethod;
  } | null>(null);
  const [editMethodName, setEditMethodName] = useState("");
  const [editMethodPrice, setEditMethodPrice] = useState("");

  const addMethodArea = areas.find((a) => a.id === addMethodAreaId);
  const carrierOptions = addMethodArea
    ? (CARRIERS_BY_COUNTRY[addMethodArea.countryCode] ?? DEFAULT_CARRIERS)
    : [];

  function formatPrice(price: number, currency: string) {
    if (price === 0) return t`Zdarma`;
    return `${price.toFixed(2)} ${currency}`;
  }

  function handleSelectCarrier() {
    if (!selectedCarrier || !addMethodAreaId) return;
    const carrier = carrierOptions.find((c) => c.id === selectedCarrier);
    if (!carrier) return;

    setAddMethodAreaId(null);
    setSelectedCarrier(null);
    setConfigureMethod({ areaId: addMethodAreaId, carrierName: carrier.name });
    setNewMethodName(carrier.name);
    setNewMethodPrice("0");
  }

  function handleAddMethod() {
    if (!configureMethod) return;
    const newMethod: ShippingMethod = {
      id: `${configureMethod.areaId}-${Date.now()}`,
      name: newMethodName,
      price: parseFloat(newMethodPrice) || 0,
      currency: "CZK",
    };
    setAreas((prev) =>
      prev.map((area) =>
        area.id === configureMethod.areaId
          ? { ...area, methods: [...area.methods, newMethod] }
          : area
      )
    );
    setConfigureMethod(null);
    setNewMethodName("");
    setNewMethodPrice("");
  }

  function handleDeleteMethod(areaId: string, methodId: string) {
    setAreas((prev) =>
      prev.map((area) =>
        area.id === areaId
          ? { ...area, methods: area.methods.filter((m) => m.id !== methodId) }
          : area
      )
    );
  }

  function handleDeleteArea(areaId: string) {
    setAreas((prev) => prev.filter((a) => a.id !== areaId));
  }

  function handleAddArea(countryCode: string) {
    const country = AVAILABLE_COUNTRIES.find((c) => c.code === countryCode);
    if (!country) return;
    const newArea: ShippingArea = {
      id: countryCode.toLowerCase(),
      countryCode,
      countryName: country.name,
      flag: COUNTRY_FLAGS[countryCode] ?? "",
      methods: [],
    };
    setAreas((prev) => [...prev, newArea]);
    setAddAreaOpen(false);
  }

  function openEditMethod(areaId: string, method: ShippingMethod) {
    setEditMethod({ areaId, method });
    setEditMethodName(method.name);
    setEditMethodPrice(String(method.price));
  }

  function handleSaveEditMethod() {
    if (!editMethod) return;
    setAreas((prev) =>
      prev.map((area) =>
        area.id === editMethod.areaId
          ? {
              ...area,
              methods: area.methods.map((m) =>
                m.id === editMethod.method.id
                  ? {
                      ...m,
                      name: editMethodName,
                      price: parseFloat(editMethodPrice) || 0,
                    }
                  : m
              ),
            }
          : area
      )
    );
    setEditMethod(null);
  }

  const usedCountryCodes = areas.map((a) => a.countryCode);
  const availableCountries = AVAILABLE_COUNTRIES.filter(
    (c) => !usedCountryCodes.includes(c.code)
  );

  return (
    <StoreSettingsLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{t`Způsoby dopravy`}</h3>
          <Button
            onClick={() => setAddAreaOpen(true)}
            disabled={availableCountries.length === 0}
          >
            <Plus className="mr-2 h-4 w-4" />
            {t`Přidat oblast`}
          </Button>
        </div>

        {/* Shipping Areas */}
        {areas.map((area) => (
          <Card key={area.id}>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">{area.flag}</span>
                <h4 className="font-semibold">{area.countryName}</h4>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setAddMethodAreaId(area.id);
                    setSelectedCarrier(null);
                  }}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  {t`Přidat dopravu`}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => handleDeleteArea(area.id)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      {t`Smazat oblast`}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <Separator />
            <CardContent className="p-0">
              {area.methods.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                  <Truck className="h-8 w-8" />
                  <p className="text-sm">{t`Zatím žádné způsoby dopravy`}</p>
                </div>
              ) : (
                <div>
                  {area.methods.map((method, index) => (
                    <div
                      key={method.id}
                      className={`group flex items-center justify-between px-6 py-4 ${
                        index < area.methods.length - 1
                          ? "border-b border-border"
                          : ""
                      }`}
                    >
                      <div>
                        <p className="text-sm font-medium">{method.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatPrice(method.price, method.currency)}
                        </p>
                      </div>
                      <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEditMethod(area.id, method)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() =>
                            handleDeleteMethod(area.id, method.id)
                          }
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {areas.length === 0 && (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-12 text-muted-foreground">
            <Package className="h-10 w-10" />
            <p className="text-sm">{t`Zatím žádné oblasti dopravy`}</p>
            <Button
              variant="outline"
              onClick={() => setAddAreaOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              {t`Přidat oblast`}
            </Button>
          </div>
        )}
      </div>

      {/* Dialog: Select carrier */}
      <Dialog
        open={addMethodAreaId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setAddMethodAreaId(null);
            setSelectedCarrier(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t`Nový způsob dopravy`}</DialogTitle>
          </DialogHeader>
          <div className="space-y-1">
            {carrierOptions.map((carrier) => (
              <button
                key={carrier.id}
                type="button"
                className={`flex w-full items-center gap-3 rounded-md px-3 py-3 text-left text-sm transition-colors ${
                  selectedCarrier === carrier.id
                    ? "bg-accent"
                    : "hover:bg-accent/50"
                }`}
                onClick={() => setSelectedCarrier(carrier.id)}
              >
                <CarrierIcon carrierId={carrier.id} />
                {carrier.name}
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button
              onClick={handleSelectCarrier}
              disabled={!selectedCarrier}
            >
              {t`Vybrat dopravu`}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setAddMethodAreaId(null);
                setSelectedCarrier(null);
              }}
            >
              {t`Zrušit`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Configure new method */}
      <Dialog
        open={configureMethod !== null}
        onOpenChange={(open) => {
          if (!open) setConfigureMethod(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t`Nastavení dopravy`}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="method-name">{t`Název`}</Label>
              <Input
                id="method-name"
                value={newMethodName}
                onChange={(e) => setNewMethodName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="method-price">{t`Cena (CZK)`}</Label>
              <Input
                id="method-price"
                type="number"
                min="0"
                step="0.01"
                value={newMethodPrice}
                onChange={(e) => setNewMethodPrice(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleAddMethod} disabled={!newMethodName.trim()}>
              {t`Přidat`}
            </Button>
            <Button
              variant="outline"
              onClick={() => setConfigureMethod(null)}
            >
              {t`Zrušit`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Edit method */}
      <Dialog
        open={editMethod !== null}
        onOpenChange={(open) => {
          if (!open) setEditMethod(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t`Upravit dopravu`}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-method-name">{t`Název`}</Label>
              <Input
                id="edit-method-name"
                value={editMethodName}
                onChange={(e) => setEditMethodName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-method-price">{t`Cena (CZK)`}</Label>
              <Input
                id="edit-method-price"
                type="number"
                min="0"
                step="0.01"
                value={editMethodPrice}
                onChange={(e) => setEditMethodPrice(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleSaveEditMethod}
              disabled={!editMethodName.trim()}
            >
              {t`Uložit`}
            </Button>
            <Button variant="outline" onClick={() => setEditMethod(null)}>
              {t`Zrušit`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Add area */}
      <Dialog open={addAreaOpen} onOpenChange={setAddAreaOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t`Přidat oblast dopravy`}</DialogTitle>
          </DialogHeader>
          <div className="space-y-1">
            {availableCountries.map((country) => (
              <button
                key={country.code}
                type="button"
                className="flex w-full items-center gap-3 rounded-md px-3 py-3 text-left text-sm transition-colors hover:bg-accent/50"
                onClick={() => handleAddArea(country.code)}
              >
                <span className="text-lg">
                  {COUNTRY_FLAGS[country.code] ?? ""}
                </span>
                {country.name}
              </button>
            ))}
            {availableCountries.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                {t`Všechny dostupné oblasti jsou již přidány.`}
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </StoreSettingsLayout>
  );
}

function CarrierIcon({ carrierId }: { carrierId: string }) {
  const iconClass = "h-5 w-5 text-muted-foreground";
  switch (carrierId) {
    case "pickup":
      return <Store className={iconClass} />;
    case "other":
      return <Truck className={iconClass} />;
    default:
      return <Package className={iconClass} />;
  }
}
