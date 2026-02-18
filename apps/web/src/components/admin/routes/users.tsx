"use client";

export function UsersPage() {
  return (
    <div>
      <h2 className="mb-4 text-2xl font-bold">Uzivatele</h2>
      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
        <p className="text-[var(--muted-foreground)]">Sprava uzivatelu bude implementovana zde.</p>
        <div className="mt-4">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="pb-2 font-medium text-[var(--muted-foreground)]">Jmeno</th>
                <th className="pb-2 font-medium text-[var(--muted-foreground)]">E-mail</th>
                <th className="pb-2 font-medium text-[var(--muted-foreground)]">Role</th>
                <th className="pb-2 font-medium text-[var(--muted-foreground)]">Stav</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-3 text-[var(--muted-foreground)]" colSpan={4}>
                  Zatim zadni uzivatele.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
