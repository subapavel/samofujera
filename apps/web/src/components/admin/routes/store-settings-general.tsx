"use client";

import { useState } from "react";
import { t } from "@lingui/core/macro";
import {
  RadioGroup,
  RadioGroupItem,
  Label,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@samofujera/ui";
import { useQuery } from "@tanstack/react-query";
import { pageAdminApi } from "@samofujera/api-client";
import type { PageResponse } from "@samofujera/api-client";
import { StoreSettingsLayout } from "../settings/store-settings-layout";
import {
  SettingsItem,
  SettingsSection,
} from "../settings/settings-item";

type UnitSystem = "METRIC" | "IMPERIAL";
type YesNo = "YES" | "NO";
type VatDisplay = "WITH_VAT" | "WITHOUT_VAT";
type DisplayOption = "HIDE" | "SHOW";

interface StoreSettings {
  unitSystem: UnitSystem;
  vatPayer: YesNo;
  vatDisplay: VatDisplay;
  additionalVatInfo: DisplayOption;
  shippingCostInfo: DisplayOption;
  termsPageSlug: string;
  privacyPageSlug: string;
  orderNotificationEmail: string;
  storeEmail: string;
}

const DEFAULT_SETTINGS: StoreSettings = {
  unitSystem: "METRIC",
  vatPayer: "NO",
  vatDisplay: "WITH_VAT",
  additionalVatInfo: "HIDE",
  shippingCostInfo: "HIDE",
  termsPageSlug: "",
  privacyPageSlug: "",
  orderNotificationEmail: "info@samofujera.cz",
  storeEmail: "obchod@samofujera.cz",
};

export function StoreSettingsGeneralPage() {
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_SETTINGS);

  const [draftUnitSystem, setDraftUnitSystem] = useState(settings.unitSystem);
  const [draftVatPayer, setDraftVatPayer] = useState(settings.vatPayer);
  const [draftVatDisplay, setDraftVatDisplay] = useState(settings.vatDisplay);
  const [draftAdditionalVatInfo, setDraftAdditionalVatInfo] = useState(
    settings.additionalVatInfo
  );
  const [draftShippingCostInfo, setDraftShippingCostInfo] = useState(
    settings.shippingCostInfo
  );
  const [draftTermsPageSlug, setDraftTermsPageSlug] = useState(
    settings.termsPageSlug
  );
  const [draftPrivacyPageSlug, setDraftPrivacyPageSlug] = useState(
    settings.privacyPageSlug
  );
  const [draftOrderEmail, setDraftOrderEmail] = useState(
    settings.orderNotificationEmail
  );
  const [draftStoreEmail, setDraftStoreEmail] = useState(settings.storeEmail);

  const pagesQuery = useQuery({
    queryKey: ["admin", "pages", "all"],
    queryFn: () => pageAdminApi.getPages({ limit: 100 }),
  });

  const pages = pagesQuery.data?.data?.items ?? [];

  function updateSetting<K extends keyof StoreSettings>(
    key: K,
    value: StoreSettings[K]
  ) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  function unitSystemLabel(value: UnitSystem) {
    return value === "METRIC" ? t`Metrické (cm, kg)` : t`Imperiální (in, lb)`;
  }

  function yesNoLabel(value: YesNo) {
    return value === "YES" ? t`Ano` : t`Ne`;
  }

  function vatDisplayLabel(value: VatDisplay) {
    return value === "WITH_VAT" ? t`Cena s DPH` : t`Cena bez DPH`;
  }

  function displayOptionLabel(value: DisplayOption) {
    return value === "SHOW" ? t`Zobrazovat` : t`Nezobrazovat`;
  }

  return (
    <StoreSettingsLayout>
      <div className="space-y-6">
        {/* Currency, Units and VAT */}
        <SettingsSection title={t`Měna, jednotky a DPH`}>
          <SettingsItem
            title={t`Jednotky hmotnosti a rozměrů`}
            value={unitSystemLabel(settings.unitSystem)}
            onEdit={() => setDraftUnitSystem(settings.unitSystem)}
            onCancel={() => setDraftUnitSystem(settings.unitSystem)}
            onSave={() => updateSetting("unitSystem", draftUnitSystem)}
          >
            {() => (
              <RadioGroup
                value={draftUnitSystem}
                onValueChange={(v) => setDraftUnitSystem(v as UnitSystem)}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="METRIC" id="unit-metric" />
                  <Label htmlFor="unit-metric">{t`Metrické (cm, kg)`}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="IMPERIAL" id="unit-imperial" />
                  <Label htmlFor="unit-imperial">{t`Imperiální (in, lb)`}</Label>
                </div>
              </RadioGroup>
            )}
          </SettingsItem>

          <SettingsItem
            title={t`Plátce DPH`}
            value={yesNoLabel(settings.vatPayer)}
            description={t`Zvolte, zda chcete u všech položek a služeb v e-shopu uvádět daně.`}
            onEdit={() => setDraftVatPayer(settings.vatPayer)}
            onCancel={() => setDraftVatPayer(settings.vatPayer)}
            onSave={() => updateSetting("vatPayer", draftVatPayer)}
            isLast
          >
            {() => (
              <RadioGroup
                value={draftVatPayer}
                onValueChange={(v) => setDraftVatPayer(v as YesNo)}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="NO" id="vat-no" />
                  <Label htmlFor="vat-no">{t`Ne`}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="YES" id="vat-yes" />
                  <Label htmlFor="vat-yes">{t`Ano`}</Label>
                </div>
              </RadioGroup>
            )}
          </SettingsItem>
        </SettingsSection>

        {/* Price Display Options */}
        <SettingsSection title={t`Možnosti zobrazení cen`}>
          <SettingsItem
            title={t`Zobrazení DPH`}
            value={vatDisplayLabel(settings.vatDisplay)}
            description={t`Můžete zobrazit cenu s DPH i bez DPH v košíku a přehledu objednávky.`}
            onEdit={() => setDraftVatDisplay(settings.vatDisplay)}
            onCancel={() => setDraftVatDisplay(settings.vatDisplay)}
            onSave={() => updateSetting("vatDisplay", draftVatDisplay)}
          >
            {() => (
              <RadioGroup
                value={draftVatDisplay}
                onValueChange={(v) => setDraftVatDisplay(v as VatDisplay)}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="WITH_VAT" id="vat-with" />
                  <Label htmlFor="vat-with">{t`Cena s DPH`}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="WITHOUT_VAT" id="vat-without" />
                  <Label htmlFor="vat-without">{t`Cena bez DPH`}</Label>
                </div>
              </RadioGroup>
            )}
          </SettingsItem>

          <SettingsItem
            title={t`Doplňující informace o DPH`}
            value={displayOptionLabel(settings.additionalVatInfo)}
            description={t`Můžete zobrazit text „Cena včetně DPH" pod cenami vašich produktů.`}
            onEdit={() => setDraftAdditionalVatInfo(settings.additionalVatInfo)}
            onCancel={() =>
              setDraftAdditionalVatInfo(settings.additionalVatInfo)
            }
            onSave={() =>
              updateSetting("additionalVatInfo", draftAdditionalVatInfo)
            }
          >
            {() => (
              <RadioGroup
                value={draftAdditionalVatInfo}
                onValueChange={(v) =>
                  setDraftAdditionalVatInfo(v as DisplayOption)
                }
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="HIDE" id="vatinfo-hide" />
                  <Label htmlFor="vatinfo-hide">{t`Nezobrazovat`}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="SHOW" id="vatinfo-show" />
                  <Label htmlFor="vatinfo-show">{t`Zobrazovat`}</Label>
                </div>
              </RadioGroup>
            )}
          </SettingsItem>

          <SettingsItem
            title={t`Informace o nákladech na dopravu`}
            value={displayOptionLabel(settings.shippingCostInfo)}
            description={t`Můžete zobrazit text „Bez nákladů na dopravu" pod cenami vašich produktů.`}
            onEdit={() => setDraftShippingCostInfo(settings.shippingCostInfo)}
            onCancel={() =>
              setDraftShippingCostInfo(settings.shippingCostInfo)
            }
            onSave={() =>
              updateSetting("shippingCostInfo", draftShippingCostInfo)
            }
            isLast
          >
            {() => (
              <RadioGroup
                value={draftShippingCostInfo}
                onValueChange={(v) =>
                  setDraftShippingCostInfo(v as DisplayOption)
                }
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="HIDE" id="shipping-hide" />
                  <Label htmlFor="shipping-hide">{t`Nezobrazovat`}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="SHOW" id="shipping-show" />
                  <Label htmlFor="shipping-show">{t`Zobrazovat text „Bez nákladů na dopravu"`}</Label>
                </div>
              </RadioGroup>
            )}
          </SettingsItem>
        </SettingsSection>

        {/* Terms and Conditions */}
        <SettingsSection title={t`Obchodní podmínky a ochrana osobních údajů`}>
          <SettingsItem
            title={t`Stránka obchodních podmínek`}
            value={
              settings.termsPageSlug
                ? (pages.find(
                    (p: PageResponse) => p.slug === settings.termsPageSlug
                  )?.title ?? settings.termsPageSlug)
                : t`Nevybráno`
            }
            description={t`Odkaz „Obchodní podmínky" v přehledu a potvrzení objednávky povede na tuto stránku.`}
            onEdit={() => setDraftTermsPageSlug(settings.termsPageSlug)}
            onCancel={() => setDraftTermsPageSlug(settings.termsPageSlug)}
            onSave={() =>
              updateSetting("termsPageSlug", draftTermsPageSlug)
            }
          >
            {() => (
              <Select
                value={draftTermsPageSlug}
                onValueChange={setDraftTermsPageSlug}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t`Vyberte stránku`} />
                </SelectTrigger>
                <SelectContent>
                  {pages.map((page: PageResponse) => (
                    <SelectItem key={page.slug} value={page.slug}>
                      {page.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </SettingsItem>

          <SettingsItem
            title={t`Stránka ochrany osobních údajů`}
            value={
              settings.privacyPageSlug
                ? (pages.find(
                    (p: PageResponse) => p.slug === settings.privacyPageSlug
                  )?.title ?? settings.privacyPageSlug)
                : t`Nevybráno`
            }
            description={t`Odkaz „Ochrana osobních údajů" v přehledu a potvrzení objednávky povede na tuto stránku.`}
            onEdit={() => setDraftPrivacyPageSlug(settings.privacyPageSlug)}
            onCancel={() => setDraftPrivacyPageSlug(settings.privacyPageSlug)}
            onSave={() =>
              updateSetting("privacyPageSlug", draftPrivacyPageSlug)
            }
            isLast
          >
            {() => (
              <Select
                value={draftPrivacyPageSlug}
                onValueChange={setDraftPrivacyPageSlug}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t`Vyberte stránku`} />
                </SelectTrigger>
                <SelectContent>
                  {pages.map((page: PageResponse) => (
                    <SelectItem key={page.slug} value={page.slug}>
                      {page.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </SettingsItem>
        </SettingsSection>

        {/* Email Communication */}
        <SettingsSection title={t`E-mailová komunikace`}>
          <SettingsItem
            title={t`E-mail pro příjem objednávek`}
            value={settings.orderNotificationEmail}
            description={t`Na tento e-mail budou zasílány všechny notifikace o nových objednávkách.`}
            onEdit={() =>
              setDraftOrderEmail(settings.orderNotificationEmail)
            }
            onCancel={() =>
              setDraftOrderEmail(settings.orderNotificationEmail)
            }
            onSave={() =>
              updateSetting("orderNotificationEmail", draftOrderEmail)
            }
          >
            {() => (
              <Input
                type="email"
                value={draftOrderEmail}
                onChange={(e) => setDraftOrderEmail(e.target.value)}
                placeholder="info@samofujera.cz"
              />
            )}
          </SettingsItem>

          <SettingsItem
            title={t`E-mailová adresa obchodu`}
            value={settings.storeEmail}
            description={t`Zákazníci budou dostávat informace o svých objednávkách z této e-mailové adresy.`}
            onEdit={() => setDraftStoreEmail(settings.storeEmail)}
            onCancel={() => setDraftStoreEmail(settings.storeEmail)}
            onSave={() => updateSetting("storeEmail", draftStoreEmail)}
            isLast
          >
            {() => (
              <Input
                type="email"
                value={draftStoreEmail}
                onChange={(e) => setDraftStoreEmail(e.target.value)}
                placeholder="obchod@samofujera.cz"
              />
            )}
          </SettingsItem>
        </SettingsSection>
      </div>
    </StoreSettingsLayout>
  );
}
