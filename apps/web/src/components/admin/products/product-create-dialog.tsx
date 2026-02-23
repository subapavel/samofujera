"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { t } from "@lingui/core/macro";
import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import type { MessageDescriptor } from "@lingui/core";
import { Loader2 } from "lucide-react";
import { adminApi } from "@samofujera/api-client";
import type { ProductType } from "@samofujera/api-client";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@samofujera/ui";

const PRODUCT_TYPES: Array<{ value: ProductType; label: MessageDescriptor }> = [
  { value: "PHYSICAL", label: msg`Fyzický produkt` },
  { value: "EBOOK", label: msg`E-book` },
  { value: "AUDIO_VIDEO", label: msg`Audio/Video` },
  { value: "ONLINE_EVENT", label: msg`Online událost` },
  { value: "RECURRING_EVENT", label: msg`Opakovaná událost` },
  { value: "OFFLINE_EVENT", label: msg`Offline událost` },
];

interface ProductCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProductCreateDialog({
  open,
  onOpenChange,
}: ProductCreateDialogProps) {
  const { _ } = useLingui();
  const router = useRouter();
  const queryClient = useQueryClient();

  const createDraftMutation = useMutation({
    mutationFn: (productType: string) => adminApi.createDraft(productType),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
      onOpenChange(false);
      router.push(`/admin/produkty/${response.data.id}`);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t`Nový produkt`}</DialogTitle>
          <DialogDescription>
            {t`Vyberte typ produktu, který chcete vytvořit.`}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-4">
          {PRODUCT_TYPES.map((pt) => (
            <Button
              key={pt.value}
              variant="outline"
              className="h-auto flex-col gap-1 py-4"
              disabled={createDraftMutation.isPending}
              onClick={() => createDraftMutation.mutate(pt.value)}
            >
              {createDraftMutation.isPending &&
              createDraftMutation.variables === pt.value ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              <span className="text-sm font-medium">{_(pt.label)}</span>
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
