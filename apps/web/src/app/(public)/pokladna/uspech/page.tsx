import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Objednávka úspěšná",
};

export default function CheckoutSuccessPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center">
      <div className="mb-6">
        <svg className="mx-auto h-16 w-16 text-green-500" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h1 className="text-2xl font-bold mb-4">Objednávka byla úspěšně zaplacena!</h1>
      <p className="text-[var(--muted-foreground)] mb-8">
        Děkujeme za nákup. Potvrzení jsme vám odeslali na e-mail.
      </p>
      <div className="flex flex-col gap-4 items-center">
        <Link
          href="/muj-ucet/knihovna"
          className="inline-flex items-center justify-center rounded-md bg-[var(--primary)] text-[var(--primary-foreground)] px-6 py-3 text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Přejít do knihovny
        </Link>
        <Link
          href="/katalog"
          className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
        >
          Zpět do katalogu
        </Link>
      </div>
    </div>
  );
}
