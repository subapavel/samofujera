import type { Messages } from "@lingui/core";
import { i18n } from "@lingui/core";
import { messages as csMessages } from "./locales/cs/messages.po";

export const locales = {
  cs: "Čeština",
  sk: "Slovenčina",
} as const;

export type Locale = keyof typeof locales;
export const defaultLocale: Locale = "cs";

// Eagerly activate Czech so SSR works without async loading
i18n.load("cs", csMessages);
i18n.activate("cs");

export async function loadCatalog(locale: Locale) {
  const mod = (await import(`./locales/${locale}/messages.po`)) as {
    messages: Messages;
  };
  i18n.load(locale, mod.messages);
  i18n.activate(locale);
}

export { i18n };
