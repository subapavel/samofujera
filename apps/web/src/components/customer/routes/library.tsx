"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { libraryApi } from "@samofujera/api-client";
import { Button, Card, CardContent } from "@samofujera/ui";

const productTypeLabels: Record<string, string> = {
  PHYSICAL: "Fyzicky produkt",
  EBOOK: "E-book",
  AUDIO_VIDEO: "Audio/Video",
  ONLINE_EVENT: "Online udalost",
  RECURRING_EVENT: "Opakovana udalost",
  OFFLINE_EVENT: "Offline udalost",
};

export function LibraryPage() {
  const router = useRouter();

  const libraryQuery = useQuery({
    queryKey: ["library"],
    queryFn: () => libraryApi.getLibrary(),
  });

  return (
    <div>
      <h2 className="mb-4 text-2xl font-bold">Knihovna</h2>

      {libraryQuery.isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-48 animate-pulse rounded-lg border border-[var(--border)] bg-[var(--card)]"
            />
          ))}
        </div>
      )}

      {libraryQuery.isError && (
        <p className="text-[var(--destructive)]">
          Nepodarilo se nacist knihovnu. Zkuste to prosim znovu.
        </p>
      )}

      {libraryQuery.isSuccess && (
        <>
          {libraryQuery.data.data.length === 0 ? (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
              <p className="text-[var(--muted-foreground)]">
                Zatim nemate zadne zakoupene produkty.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {libraryQuery.data.data.map((item) => (
                <Card key={item.productId}>
                  <CardContent className="flex flex-col gap-3 p-4">
                    {item.thumbnailUrl ? (
                      <img
                        src={item.thumbnailUrl}
                        alt={item.productTitle}
                        className="h-32 w-full rounded-md object-cover"
                      />
                    ) : (
                      <div className="flex h-32 w-full items-center justify-center rounded-md bg-[var(--accent)]">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="40"
                          height="40"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="text-[var(--muted-foreground)]"
                        >
                          <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
                          <path d="M14 2v4a2 2 0 0 0 2 2h4" />
                        </svg>
                      </div>
                    )}

                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-semibold leading-tight">
                        {item.productTitle}
                      </h3>
                      <span className="shrink-0 rounded-full bg-[var(--primary)]/10 px-2 py-0.5 text-xs font-medium text-[var(--primary)]">
                        {productTypeLabels[item.productType] ?? item.productType}
                      </span>
                    </div>

                    <p className="text-xs text-[var(--muted-foreground)]">
                      Zakoupeno: {new Date(item.grantedAt).toLocaleDateString("cs-CZ")}
                    </p>

                    <Button
                      size="sm"
                      onClick={() => router.push(`/muj-ucet/knihovna/${item.productId}`)}
                    >
                      Zobrazit
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
