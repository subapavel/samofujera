import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { adminApi } from "@samofujera/api-client";
import type { ProductType } from "@samofujera/api-client";
import { Button } from "@samofujera/ui";

const PRODUCT_TYPES: Array<{ value: ProductType; label: string; description: string }> = [
  { value: "PHYSICAL", label: "Fyzický produkt", description: "Hmotný produkt s variantami a skladem" },
  { value: "EBOOK", label: "E-book", description: "Digitální soubory ke stažení" },
  { value: "AUDIO_VIDEO", label: "Audio/Video", description: "Streamovaný obsah přes Cloudflare" },
  { value: "ONLINE_EVENT", label: "Online událost", description: "Jednorázová online událost" },
  { value: "RECURRING_EVENT", label: "Opakovaná událost", description: "Pravidelně se opakující událost" },
  { value: "OFFLINE_EVENT", label: "Offline událost", description: "Prezenční událost na místě" },
];

export function ProductNewPage() {
  const navigate = useNavigate();

  const createDraftMutation = useMutation({
    mutationFn: (productType: ProductType) => adminApi.createDraft(productType),
    onSuccess: (response) => {
      void navigate({ to: "/produkty/$productId", params: { productId: response.data.id } });
    },
  });

  return (
    <div>
      <h2 className="mb-4 text-2xl font-bold">Nový produkt</h2>
      <p className="mb-6 text-[var(--muted-foreground)]">Vyberte typ produktu</p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PRODUCT_TYPES.map((t) => (
          <button
            key={t.value}
            type="button"
            disabled={createDraftMutation.isPending}
            onClick={() => createDraftMutation.mutate(t.value)}
            className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-5 text-left transition-colors hover:border-[var(--ring)] hover:bg-[var(--accent)] disabled:opacity-50"
          >
            <p className="text-sm font-medium">{t.label}</p>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">{t.description}</p>
          </button>
        ))}
      </div>

      {createDraftMutation.isError && (
        <p className="mt-4 text-sm text-[var(--destructive)]">
          Nepodařilo se vytvořit produkt. Zkuste to prosím znovu.
        </p>
      )}

      {createDraftMutation.isPending && (
        <p className="mt-4 text-sm text-[var(--muted-foreground)]">
          Vytvářím produkt...
        </p>
      )}

      <Button
        variant="outline"
        className="mt-6"
        onClick={() => void navigate({ to: "/produkty" })}
      >
        Zpět na produkty
      </Button>
    </div>
  );
}
