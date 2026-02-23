import type { Metadata } from "next";
import { CatalogContent } from "@/components/catalog/CatalogContent";
import { Providers } from "@/components/dashboard/Providers";

export const metadata: Metadata = {
  title: "Obchod | Samo Fujera",
  description: "Produkty pro osobní rozvoj, zdraví a duchovní růst.",
  openGraph: {
    title: "Obchod | Samo Fujera",
    description: "Produkty pro osobní rozvoj, zdraví a duchovní růst.",
    images: [
      {
        url: "/api/og-image/page/katalog",
        width: 1200,
        height: 630,
      },
    ],
  },
};

export default function CatalogPage() {
  return (
    <Providers>
      <CatalogContent />
    </Providers>
  );
}
