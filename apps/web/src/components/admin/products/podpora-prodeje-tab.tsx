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
} from "@samofujera/ui";

interface PodporaProdejeTabProps {
  form: UseFormReturn<any>;
  disabled: boolean;
}

export function PodporaProdejeTab({ form, disabled }: PodporaProdejeTabProps) {
  return (
    <div className="space-y-6">
      <h3 className="mb-4 text-sm font-semibold">{t`Podpora prodeje`}</h3>
      <div className="flex gap-4">
        <FormField
          control={form.control}
          name="badge"
          render={({ field }) => (
            <FormItem className="flex-1">
              <FormLabel>{t`Stitek produktu`}</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  disabled={disabled}
                  placeholder={t`napr. Novinka`}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="comparePriceCzk"
          render={({ field }) => (
            <FormItem className="flex-1">
              <FormLabel>{t`Puvodni cena`}</FormLabel>
              <FormControl>
                <div className="flex items-center gap-2">
                  <Input
                    {...field}
                    type="number"
                    min="0"
                    step="0.01"
                    disabled={disabled}
                  />
                  <span className="text-sm text-[var(--muted-foreground)]">
                    Kc
                  </span>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
