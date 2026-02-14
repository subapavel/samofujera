import { i18n } from "@lingui/core";

export const locales = {
  cs: "Čeština",
  sk: "Slovenčina",
} as const;

export type Locale = keyof typeof locales;
export const defaultLocale: Locale = "cs";

export async function loadCatalog(locale: Locale) {
  const { messages } = await import(`./locales/${locale}/messages.po`);
  i18n.load(locale, messages);
  i18n.activate(locale);
}

export { i18n };
