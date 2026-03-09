"use client";

import { useState } from "react";
import { t } from "@lingui/core/macro";
import { Input, Label } from "@samofujera/ui";
import { StoreSettingsLayout } from "../settings/store-settings-layout";
import { SettingsItem } from "../settings/settings-item";

export function StoreSettingsProductsPage() {
  // Weight
  const [weight, setWeight] = useState(0.3);
  const [draftWeight, setDraftWeight] = useState("0.300");

  // Size (width x length x height)
  const [sizeWidth, setSizeWidth] = useState(10);
  const [sizeLength, setSizeLength] = useState(15);
  const [sizeHeight, setSizeHeight] = useState(20);
  const [draftWidth, setDraftWidth] = useState("10.00");
  const [draftLength, setDraftLength] = useState("15.00");
  const [draftHeight, setDraftHeight] = useState("20.00");

  return (
    <StoreSettingsLayout>
      <div className="space-y-6">
        <h3 className="text-lg font-semibold">
          {t`Hromadné nastavení produktů`}
        </h3>

        <div className="rounded-lg border bg-card p-6 space-y-6">
          <SettingsItem
            title={t`Hromadná váha produktu`}
            value={`${weight.toFixed(3)} kg`}
            description={t`Hromadná váha se použije pro výpočet nákladů na dopravu u všech produktů, kde není nastavena individuální váha.`}
            onEdit={() => setDraftWeight(weight.toFixed(3))}
            onCancel={() => setDraftWeight(weight.toFixed(3))}
            onSave={() => setWeight(parseFloat(draftWeight) || 0)}
          >
            {() => (
              <div className="space-y-2">
                <Label>{t`Váha`}</Label>
                <div className="relative">
                  <Input
                    type="number"
                    min="0"
                    step="0.001"
                    value={draftWeight}
                    onChange={(e) => setDraftWeight(e.target.value)}
                    className="pr-12"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    kg
                  </span>
                </div>
              </div>
            )}
          </SettingsItem>

          <SettingsItem
            title={t`Celková velikost produktu`}
            value={`${sizeWidth.toFixed(2)} x ${sizeLength.toFixed(2)} x ${sizeHeight.toFixed(2)} cm`}
            description={t`Výchozí rozměry balíku (šířka × délka × výška) pro produkty bez individuálního nastavení.`}
            onEdit={() => {
              setDraftWidth(sizeWidth.toFixed(2));
              setDraftLength(sizeLength.toFixed(2));
              setDraftHeight(sizeHeight.toFixed(2));
            }}
            onCancel={() => {
              setDraftWidth(sizeWidth.toFixed(2));
              setDraftLength(sizeLength.toFixed(2));
              setDraftHeight(sizeHeight.toFixed(2));
            }}
            onSave={() => {
              setSizeWidth(parseFloat(draftWidth) || 0);
              setSizeLength(parseFloat(draftLength) || 0);
              setSizeHeight(parseFloat(draftHeight) || 0);
            }}
            isLast
          >
            {() => (
              <div className="space-y-2">
                <Label>{t`Rozměry (Šířka × Délka × Výška)`}</Label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={draftWidth}
                      onChange={(e) => setDraftWidth(e.target.value)}
                      className="pr-10"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      cm
                    </span>
                  </div>
                  <span className="text-muted-foreground">×</span>
                  <div className="relative flex-1">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={draftLength}
                      onChange={(e) => setDraftLength(e.target.value)}
                      className="pr-10"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      cm
                    </span>
                  </div>
                  <span className="text-muted-foreground">×</span>
                  <div className="relative flex-1">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={draftHeight}
                      onChange={(e) => setDraftHeight(e.target.value)}
                      className="pr-10"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      cm
                    </span>
                  </div>
                </div>
              </div>
            )}
          </SettingsItem>
        </div>
      </div>
    </StoreSettingsLayout>
  );
}
