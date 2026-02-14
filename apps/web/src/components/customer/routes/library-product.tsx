import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useNavigate } from "@tanstack/react-router";
import { libraryApi, ApiError } from "@samofujera/api-client";
import { Button, Alert, AlertDescription } from "@samofujera/ui";

const assetTypeLabels: Record<string, string> = {
  PDF: "PDF",
  EPUB: "EPUB",
  MP3: "MP3",
  MP4: "Video",
  ZIP: "Archiv",
  IMAGE: "Obrázek",
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export function LibraryProductPage() {
  const { productId } = useParams({ strict: false }) as { productId: string };
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const assetsQuery = useQuery({
    queryKey: ["library", productId, "assets"],
    queryFn: () => libraryApi.getAssets(productId),
    enabled: Boolean(productId),
  });

  const downloadMutation = useMutation({
    mutationFn: (assetId: string) => libraryApi.download(assetId),
    onSuccess: (data) => {
      setErrorMessage(null);
      window.open(data.data.downloadUrl, "_blank");
    },
    onError: (error: unknown) => {
      if (error instanceof ApiError) {
        if (error.status === 429) {
          setErrorMessage(
            "Příliš mnoho stažení. Zkuste to prosím za hodinu.",
          );
        } else if (error.status === 403) {
          setErrorMessage("K tomuto produktu nemáte přístup.");
        } else {
          setErrorMessage("Nepodařilo se stáhnout soubor. Zkuste to znovu.");
        }
      } else {
        setErrorMessage("Nepodařilo se stáhnout soubor. Zkuste to znovu.");
      }
    },
  });

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => void navigate({ to: "/knihovna" })}
        >
          Zpět na knihovnu
        </Button>
        <h2 className="text-2xl font-bold">Soubory produktu</h2>
      </div>

      {errorMessage && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      {assetsQuery.isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-lg border border-[var(--border)] bg-[var(--card)]"
            />
          ))}
        </div>
      )}

      {assetsQuery.isError && (
        <p className="text-[var(--destructive)]">
          Nepodařilo se načíst soubory. Zkuste to prosím znovu.
        </p>
      )}

      {assetsQuery.isSuccess && (
        <>
          {assetsQuery.data.data.length === 0 ? (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
              <p className="text-[var(--muted-foreground)]">
                Tento produkt nemá žádné soubory ke stažení.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {assetsQuery.data.data.map((asset) => (
                <div
                  key={asset.id}
                  className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--card)] p-4"
                >
                  <div className="flex items-center gap-4">
                    <span className="rounded-md bg-[var(--accent)] px-2.5 py-1 text-xs font-semibold text-[var(--accent-foreground)]">
                      {assetTypeLabels[asset.assetType] ?? asset.assetType}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{asset.fileName}</p>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        {formatFileSize(asset.fileSizeBytes)}
                        {asset.durationSeconds != null &&
                          ` \u00B7 ${Math.floor(asset.durationSeconds / 60)}:${String(Math.floor(asset.durationSeconds % 60)).padStart(2, "0")}`}
                      </p>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    disabled={downloadMutation.isPending}
                    onClick={() => downloadMutation.mutate(asset.id)}
                  >
                    Stáhnout
                  </Button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
