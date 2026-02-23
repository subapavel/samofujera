"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { t } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { FileText, Loader2 } from "lucide-react";
import { libraryApi } from "@samofujera/api-client";
import { Badge, Button, Card, CardContent } from "@samofujera/ui";
import { PageHeader } from "@/components/dashboard/page-header";
import { productTypeDescriptor } from "../../catalog/utils";

export function LibraryPage() {
  const { _ } = useLingui();
  const router = useRouter();

  const libraryQuery = useQuery({
    queryKey: ["library"],
    queryFn: () => libraryApi.getLibrary(),
  });

  return (
    <div className="flex flex-1 flex-col gap-4 sm:gap-6">
      <PageHeader
        title={t`Knihovna`}
        subtitle={t`Vaše zakoupené produkty a obsah.`}
      />

      {libraryQuery.isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : libraryQuery.isError ? (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-6 text-center text-sm text-destructive">
          {t`Nepodařilo se načíst knihovnu. Zkuste to prosím znovu.`}
        </div>
      ) : (libraryQuery.data?.data ?? []).length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {t`Zatím nemáte žádné zakoupené produkty.`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(libraryQuery.data?.data ?? []).map((item) => (
            <Card key={item.productId} className="overflow-hidden">
              <CardContent className="flex flex-col gap-3 p-4">
                {item.thumbnailUrl ? (
                  <img
                    src={item.thumbnailUrl}
                    alt={item.productTitle}
                    className="h-32 w-full rounded-md object-cover"
                  />
                ) : (
                  <div className="flex h-32 w-full items-center justify-center rounded-md bg-accent">
                    <FileText className="h-10 w-10 text-muted-foreground" />
                  </div>
                )}

                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold leading-tight">
                    {item.productTitle}
                  </h3>
                  <Badge variant="secondary">
                    {_(productTypeDescriptor(item.productType))}
                  </Badge>
                </div>

                <p className="text-xs text-muted-foreground">
                  {t`Zakoupeno`}:{" "}
                  {new Date(item.grantedAt).toLocaleDateString("cs-CZ")}
                </p>

                <Button
                  size="sm"
                  onClick={() =>
                    router.push(`/muj-ucet/knihovna/${item.productId}`)
                  }
                >
                  {t`Zobrazit`}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
