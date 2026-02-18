"use client";

export function DashboardPage() {
  return (
    <div>
      <h2 className="mb-4 text-2xl font-bold">Dashboard</h2>
      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
        <p className="text-[var(--muted-foreground)]">
          Vitejte ve svem zakaznickem panelu. Pomoci navigace vlevo muzete spravovat svuj profil,
          aktivni sezeni nebo ucet.
        </p>
      </div>
    </div>
  );
}
