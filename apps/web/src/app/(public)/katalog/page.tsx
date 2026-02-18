import type { Metadata } from "next";
import { CatalogContent } from "@/components/catalog/CatalogContent";
import { Providers } from "@/components/dashboard/Providers";

export const metadata: Metadata = {
  title: "Obchod",
};

export default function CatalogPage() {
  return (
    <Providers>
      <CatalogContent />
    </Providers>
  );
}
