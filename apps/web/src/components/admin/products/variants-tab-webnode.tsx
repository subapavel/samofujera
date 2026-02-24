"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { t } from "@lingui/core/macro";
import { Trash2, X } from "lucide-react";
import { adminApi } from "@samofujera/api-client";
import type { VariantResponse, CreateVariantRequest } from "@samofujera/api-client";
import {
  Button,
  Input,
  Label,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@samofujera/ui";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

interface VariantsTabWebnodeProps {
  productId: string;
  variants: VariantResponse[];
  variantCategoryName: string;
  onInvalidate: () => Promise<void>;
  onCategoryNameChange: (name: string) => void;
}

interface VariantLocalState {
  priceCZK: string;
  stockLimit: string;
  availability: string;
  sku: string;
  weightKg: string;
  hidden: boolean;
}

export function VariantsTabWebnode({
  productId,
  variants,
  variantCategoryName,
  onInvalidate,
  onCategoryNameChange,
}: VariantsTabWebnodeProps) {
  const [showCreator, setShowCreator] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const debounceRefs = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [localState, setLocalState] = useState<Record<string, VariantLocalState>>({});
  const initializedRef = useRef<Set<string>>(new Set());

  // Initialize local state from variants
  useEffect(() => {
    const newState: Record<string, VariantLocalState> = { ...localState };
    let changed = false;
    for (const v of variants) {
      if (!initializedRef.current.has(v.id)) {
        newState[v.id] = {
          priceCZK: v.prices.CZK != null ? String(v.prices.CZK) : "",
          stockLimit: v.stock != null ? String(v.stock) : "",
          availability: v.availability ?? "hidden",
          sku: v.sku,
          weightKg: v.weightKg != null ? String(v.weightKg) : "",
          hidden: v.hidden,
        };
        initializedRef.current.add(v.id);
        changed = true;
      }
    }
    if (changed) {
      setLocalState(newState);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variants]);

  // Cleanup debounce timers on unmount
  useEffect(() => {
    const refs = debounceRefs.current;
    return () => {
      for (const key of Object.keys(refs)) {
        clearTimeout(refs[key]);
      }
    };
  }, []);

  const createVariantMutation = useMutation({
    mutationFn: (data: CreateVariantRequest) => adminApi.createVariant(productId, data),
    onSuccess: async () => {
      await onInvalidate();
    },
  });

  const deleteVariantMutation = useMutation({
    mutationFn: (variantId: string) => adminApi.deleteVariant(productId, variantId),
    onSuccess: async () => {
      await onInvalidate();
    },
  });

  const updateVariantMutation = useMutation({
    mutationFn: ({ variantId, data }: { variantId: string; data: CreateVariantRequest }) =>
      adminApi.updateVariant(productId, variantId, data),
  });

  const isPending =
    createVariantMutation.isPending ||
    deleteVariantMutation.isPending;

  const handleCreateVariant = useCallback(
    (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      createVariantMutation.mutate({
        name: trimmed,
        sku: slugify(trimmed),
        stock: 0,
        sortOrder: variants.length,
        prices: {},
        availability: "hidden",
      });
    },
    [createVariantMutation, variants.length],
  );

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const value = tagInput.replace(",", "").trim();
      if (value) {
        handleCreateVariant(value);
        setTagInput("");
      }
    }
  };

  const handleDeleteVariant = (variantId: string, variantName: string) => {
    if (window.confirm(t`Opravdu chcete smazat variantu "${variantName}"?`)) {
      initializedRef.current.delete(variantId);
      deleteVariantMutation.mutate(variantId);
    }
  };

  const handleDeleteAll = () => {
    if (variants.length === 0) return;
    if (window.confirm(t`Opravdu chcete smazat všechny varianty?`)) {
      for (const v of variants) {
        initializedRef.current.delete(v.id);
        deleteVariantMutation.mutate(v.id);
      }
    }
  };

  const buildUpdateRequest = (variant: VariantResponse, state: VariantLocalState): CreateVariantRequest => {
    const prices: Record<string, number> = { ...variant.prices };
    if (state.priceCZK) {
      prices.CZK = Number(state.priceCZK);
    } else {
      delete prices.CZK;
    }
    return {
      name: variant.name,
      sku: state.sku,
      stock: state.stockLimit ? Number(state.stockLimit) : 0,
      sortOrder: variant.sortOrder,
      prices,
      availability: state.availability,
      weightKg: state.weightKg ? Number(state.weightKg) : undefined,
      hidden: state.hidden,
    };
  };

  const debouncedUpdate = useCallback(
    (variantId: string, variant: VariantResponse, state: VariantLocalState) => {
      if (debounceRefs.current[variantId]) {
        clearTimeout(debounceRefs.current[variantId]);
      }
      debounceRefs.current[variantId] = setTimeout(() => {
        updateVariantMutation.mutate({
          variantId,
          data: buildUpdateRequest(variant, state),
        });
        delete debounceRefs.current[variantId];
      }, 300);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [updateVariantMutation],
  );

  const updateField = (
    variantId: string,
    variant: VariantResponse,
    field: keyof VariantLocalState,
    value: string | boolean,
  ) => {
    setLocalState((prev) => {
      const current = prev[variantId];
      if (!current) return prev;
      const updated = { ...current, [field]: value };
      // Schedule debounced API call
      debouncedUpdate(variantId, variant, updated);
      return { ...prev, [variantId]: updated };
    });
  };

  const hasVariants = variants.length > 0;
  const showEmptyState = !hasVariants && !variantCategoryName && !showCreator;
  const showCreatorSection = showCreator || hasVariants || !!variantCategoryName;

  // ---- Empty State ----
  if (showEmptyState) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <h3 className="mb-2 text-lg font-semibold">{t`Tvorba variant`}</h3>
          <p className="mb-6 max-w-md text-sm text-[var(--muted-foreground)]">
            {t`Vytvořte varianty a prodávejte produkty v různých barvách či velikostech. Nastavte pro každou variantu vlastní cenu a skladovou dostupnost.`}
          </p>
          <Button onClick={() => setShowCreator(true)}>
            {t`Vytvořit první variantu`}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ---- Creator + Settings ----
  return (
    <div className="space-y-6">
      {/* Creator section */}
      {showCreatorSection && (
        <Card>
          <CardHeader>
            <CardTitle>{t`Tvorba variant`}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Category name */}
            <div className="space-y-2">
              <Label>{t`Kategorie variant`}</Label>
              <Input
                value={variantCategoryName}
                onChange={(e) => onCategoryNameChange(e.target.value)}
                placeholder={t`např. Velikosti`}
              />
            </div>

            {/* Tag input area */}
            <div className="space-y-2">
              <Label>{t`Varianty produktu`}</Label>
              <div className="flex items-start gap-2">
                <div className="flex min-h-10 flex-1 flex-wrap items-center gap-1.5 rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-2">
                  {variants.map((v) => (
                    <span
                      key={v.id}
                      className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--muted)] px-2.5 py-0.5 text-sm"
                    >
                      {v.name}
                      <button
                        type="button"
                        onClick={() => handleDeleteVariant(v.id, v.name)}
                        disabled={isPending}
                        className="ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full text-[var(--muted-foreground)] hover:bg-[var(--destructive)] hover:text-[var(--destructive-foreground)]"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagInputKeyDown}
                    placeholder={hasVariants ? "" : t`Zadejte název varianty`}
                    disabled={isPending}
                    className="min-w-[120px] flex-1 border-none bg-transparent text-sm outline-none placeholder:text-[var(--muted-foreground)]"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleDeleteAll}
                  disabled={isPending || !hasVariants}
                  title={t`Smazat všechny varianty`}
                >
                  <Trash2 className="h-4 w-4 text-[var(--destructive)]" />
                </Button>
              </div>
            </div>

            {(createVariantMutation.isError || deleteVariantMutation.isError) && (
              <p className="text-sm text-[var(--destructive)]">
                {t`Operace se nezdařila. Zkuste to prosím znovu.`}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Settings table */}
      {hasVariants && (
        <Card>
          <CardHeader>
            <CardTitle>{t`Nastavení variant`}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t`Varianta`}</TableHead>
                    <TableHead>{t`Cena s DPH`}</TableHead>
                    <TableHead>{t`Omezit dostupnost`}</TableHead>
                    <TableHead>{t`Dostupnost`}</TableHead>
                    <TableHead>{t`Produktové číslo`}</TableHead>
                    <TableHead>{t`Váha`}</TableHead>
                    <TableHead className="w-16">{t`Skrýt`}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {variants.map((variant) => {
                    const state = localState[variant.id];
                    if (!state) return null;
                    return (
                      <TableRow key={variant.id}>
                        <TableCell className="px-2 py-1.5 font-medium">
                          {variant.name}
                        </TableCell>
                        <TableCell className="px-2 py-1.5">
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={state.priceCZK}
                              onChange={(e) => updateField(variant.id, variant, "priceCZK", e.target.value)}
                              className="h-8 w-24"
                            />
                            <span className="text-sm text-[var(--muted-foreground)]">Kč</span>
                          </div>
                        </TableCell>
                        <TableCell className="px-2 py-1.5">
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              min="0"
                              value={state.stockLimit}
                              onChange={(e) => updateField(variant.id, variant, "stockLimit", e.target.value)}
                              className="h-8 w-20"
                            />
                            <span className="text-sm text-[var(--muted-foreground)]">ks</span>
                          </div>
                        </TableCell>
                        <TableCell className="px-2 py-1.5">
                          <Select
                            value={state.availability}
                            onValueChange={(value) => updateField(variant.id, variant, "availability", value)}
                          >
                            <SelectTrigger className="h-8 w-40">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="hidden">{t`Nezobrazovat`}</SelectItem>
                              <SelectItem value="in_stock">{t`Skladem`}</SelectItem>
                              <SelectItem value="out_of_stock">{t`Není skladem`}</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="px-2 py-1.5">
                          <Input
                            value={state.sku}
                            onChange={(e) => updateField(variant.id, variant, "sku", e.target.value)}
                            className="h-8 w-28"
                          />
                        </TableCell>
                        <TableCell className="px-2 py-1.5">
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={state.weightKg}
                              onChange={(e) => updateField(variant.id, variant, "weightKg", e.target.value)}
                              className="h-8 w-20"
                            />
                            <span className="text-sm text-[var(--muted-foreground)]">kg</span>
                          </div>
                        </TableCell>
                        <TableCell className="px-2 py-1.5 text-center">
                          <Checkbox
                            checked={state.hidden}
                            onCheckedChange={(checked) =>
                              updateField(variant.id, variant, "hidden", checked === true)
                            }
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {updateVariantMutation.isError && (
              <p className="mt-2 text-sm text-[var(--destructive)]">
                {t`Aktualizace varianty se nezdařila. Zkuste to prosím znovu.`}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
