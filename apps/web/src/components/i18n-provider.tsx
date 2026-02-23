"use client";

import { useEffect, useState, type ReactNode } from "react";
import { I18nProvider as LinguiI18nProvider } from "@lingui/react";
import { i18n, loadCatalog, defaultLocale, type Locale } from "@samofujera/i18n";

interface I18nProviderProps {
  locale?: string;
  children: ReactNode;
}

export function I18nProvider({ locale, children }: I18nProviderProps) {
  const activeLocale = (locale === "sk" ? "sk" : "cs") as Locale;
  // Czech is eagerly loaded in i18n.ts, so we only need async load for other locales
  const [loaded, setLoaded] = useState(activeLocale === defaultLocale);

  useEffect(() => {
    if (activeLocale !== defaultLocale) {
      loadCatalog(activeLocale).then(() => setLoaded(true));
    }
  }, [activeLocale]);

  if (!loaded) return null;

  return <LinguiI18nProvider i18n={i18n}>{children}</LinguiI18nProvider>;
}
