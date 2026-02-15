export function formatPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat("cs-CZ", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatPrices(prices: Record<string, number>): string {
  const entries = Object.entries(prices);
  if (entries.length === 0) return "";
  return entries.map(([currency, amount]) => formatPrice(amount, currency)).join(" / ");
}

export function primaryPrice(prices: Record<string, number>): { amount: number; currency: string } | null {
  if (prices.CZK != null) return { amount: prices.CZK, currency: "CZK" };
  const first = Object.entries(prices)[0];
  if (first) return { amount: first[1], currency: first[0] };
  return null;
}

export function productTypeLabel(type: string): string {
  switch (type) {
    case "PHYSICAL":
      return "Fyzicky produkt";
    case "EBOOK":
      return "E-book";
    case "AUDIO_VIDEO":
      return "Audio/Video";
    case "ONLINE_EVENT":
      return "Online udalost";
    case "RECURRING_EVENT":
      return "Opakovana udalost";
    case "OFFLINE_EVENT":
      return "Offline udalost";
    default:
      return type;
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
