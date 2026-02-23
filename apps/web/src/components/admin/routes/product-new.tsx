"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { t } from "@lingui/core/macro";
import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import type { MessageDescriptor } from "@lingui/core";
import { adminApi } from "@samofujera/api-client";
import type { ProductType } from "@samofujera/api-client";
import { Button } from "@samofujera/ui";

const PRODUCT_TYPES: Array<{ value: ProductType; label: MessageDescriptor; description: MessageDescriptor }> = [
  { value: "PHYSICAL", label: msg`Fyzický produkt`, description: msg`Hmotný produkt s variantami a skladem` },
  { value: "EBOOK", label: msg`E-book`, description: msg`Digitální soubory ke stažení` },
  { value: "AUDIO_VIDEO", label: msg`Audio/Video`, description: msg`Streamovaný obsah přes Cloudflare` },
  { value: "ONLINE_EVENT", label: msg`Online událost`, description: msg`Jednorázová online událost` },
  { value: "RECURRING_EVENT", label: msg`Opakovaná událost`, description: msg`Pravidelně se opakující událost` },
  { value: "OFFLINE_EVENT", label: msg`Offline událost`, description: msg`Prezenční událost na místě` },
];

export function ProductNewPage() {
  const { _ } = useLingui();
  const router = useRouter();

  const createDraftMutation = useMutation({
    mutationFn: (productType: ProductType) => adminApi.createDraft(productType),
    onSuccess: (response) => {
      router.push(`/admin/produkty/${response.data.id}`);
    },
  });

  return (
    <div>
      <h2 className="mb-4 text-2xl font-bold">{t`Nový produkt`}</h2>
      <p className="mb-6 text-[var(--muted-foreground)]">{t`Vyberte typ produktu`}</p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PRODUCT_TYPES.map((pt) => (
          <button
            key={pt.value}
            type="button"
            disabled={createDraftMutation.isPending}
            onClick={() => createDraftMutation.mutate(pt.value)}
            className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-5 text-left transition-colors hover:border-[var(--ring)] hover:bg-[var(--accent)] disabled:opacity-50"
          >
            <p className="text-sm font-medium">{_(pt.label)}</p>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">{_(pt.description)}</p>
          </button>
        ))}
      </div>

      {createDraftMutation.isError && (
        <p className="mt-4 text-sm text-[var(--destructive)]">
          {t`Nepodařilo se vytvořit produkt. Zkuste to prosím znovu.`}
        </p>
      )}

      {createDraftMutation.isPending && (
        <p className="mt-4 text-sm text-[var(--muted-foreground)]">
          {t`Vytvářím produkt...`}
        </p>
      )}

      <Button
        variant="outline"
        className="mt-6"
        onClick={() => router.push("/admin/produkty")}
      >
        {t`Zpět na produkty`}
      </Button>
    </div>
  );
}
