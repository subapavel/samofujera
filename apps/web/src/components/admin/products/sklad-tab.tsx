"use client";

import { t } from "@lingui/core/macro";
import type { UseFormReturn } from "react-hook-form";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Input,
  Checkbox,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@samofujera/ui";

interface SkladTabProps {
  form: UseFormReturn<any>;
  disabled: boolean;
}

export function SkladTab({ form, disabled }: SkladTabProps) {
  const stockLimitEnabled = form.watch("stockLimitEnabled");

  return (
    <div className="space-y-6">
      {/* Sprava skladu */}
      <div>
        <h3 className="mb-4 text-sm font-semibold">{t`Sprava skladu`}</h3>
        <div className="space-y-4">
          {/* Row: Dostupnost + Omezit dostupnost */}
          <div className="flex gap-4">
            <FormField
              control={form.control}
              name="availability"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel>{t`Dostupnost`}</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={disabled}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="hidden">{t`Nezobrazovat`}</SelectItem>
                      <SelectItem value="in_stock">{t`Skladem`}</SelectItem>
                      <SelectItem value="out_of_stock">{t`Neni skladem`}</SelectItem>
                      <SelectItem value="preorder">{t`Na objednavku`}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex-1">
              <FormField
                control={form.control}
                name="stockLimitEnabled"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center gap-2 pt-8">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={disabled}
                        />
                      </FormControl>
                      <FormLabel className="!mt-0">{t`Omezit dostupnost`}</FormLabel>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="stockLimit"
                render={({ field }) => (
                  <FormItem className="mt-2">
                    <FormControl>
                      <div className="flex items-center gap-2">
                        <Input
                          {...field}
                          type="number"
                          min="0"
                          disabled={disabled || !stockLimitEnabled}
                          className="w-24"
                        />
                        <span className="text-sm text-[var(--muted-foreground)]">
                          ks
                        </span>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Produktove cislo */}
          <FormField
            control={form.control}
            name="sku"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t`Produktove cislo`}</FormLabel>
                <FormControl>
                  <Input {...field} disabled={disabled} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      {/* Doprava */}
      <div>
        <h3 className="mb-4 text-sm font-semibold">{t`Doprava`}</h3>
        <div className="space-y-4">
          {/* Vaha */}
          <FormField
            control={form.control}
            name="weightKg"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t`Vaha`}</FormLabel>
                <FormControl>
                  <div className="flex items-center gap-2">
                    <Input
                      {...field}
                      type="number"
                      min="0"
                      step="0.01"
                      disabled={disabled}
                      className="w-32"
                    />
                    <span className="text-sm text-[var(--muted-foreground)]">
                      kg
                    </span>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Rozmery */}
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              {t`Rozmery`}
            </label>
            <div className="flex items-center gap-2">
              <FormField
                control={form.control}
                name="dimensionWidthCm"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel className="text-xs text-[var(--muted-foreground)]">
                      {t`Sirka`}
                    </FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-1">
                        <Input
                          {...field}
                          type="number"
                          min="0"
                          step="0.1"
                          disabled={disabled}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <span className="pt-6 text-sm text-[var(--muted-foreground)]">
                x
              </span>
              <FormField
                control={form.control}
                name="dimensionLengthCm"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel className="text-xs text-[var(--muted-foreground)]">
                      {t`Delka`}
                    </FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-1">
                        <Input
                          {...field}
                          type="number"
                          min="0"
                          step="0.1"
                          disabled={disabled}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <span className="pt-6 text-sm text-[var(--muted-foreground)]">
                x
              </span>
              <FormField
                control={form.control}
                name="dimensionHeightCm"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel className="text-xs text-[var(--muted-foreground)]">
                      {t`Vyska`}
                    </FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-1">
                        <Input
                          {...field}
                          type="number"
                          min="0"
                          step="0.1"
                          disabled={disabled}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <span className="pt-6 text-sm text-[var(--muted-foreground)]">
                cm
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
