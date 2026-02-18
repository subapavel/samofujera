import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Objednávka zrušena",
};

export default function CheckoutCancelledPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center">
      <div className="mb-6">
        <svg className="mx-auto h-16 w-16 text-[var(--muted-foreground)]" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h1 className="text-2xl font-bold mb-4">Objednávka byla zrušena</h1>
      <p className="text-[var(--muted-foreground)] mb-8">
        Platba nebyla provedena. Můžete se vrátit do katalogu a zkusit to znovu.
      </p>
      <Link
        href="/katalog"
        className="inline-flex items-center justify-center rounded-md bg-[var(--primary)] text-[var(--primary-foreground)] px-6 py-3 text-sm font-medium hover:opacity-90 transition-opacity"
      >
        Zpět do katalogu
      </Link>
    </div>
  );
}
