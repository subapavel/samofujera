export type Locale = "cs" | "sk";

export const translations = {
  cs: {
    greeting: "Dobrý den",
    closing: "S pozdravem,\nTým Sámo Fujera",
    visitUs: "Navštivte nás na",
    defaultCta: "Přejít na web",
  },
  sk: {
    greeting: "Dobrý deň",
    closing: "S pozdravom,\nTím Sámo Fujera",
    visitUs: "Navštívte nás na",
    defaultCta: "Prejsť na web",
  },
} as const;

export function t(locale: Locale) {
  return translations[locale];
}
