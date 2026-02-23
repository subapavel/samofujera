"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { libraryApi, ApiError } from "@samofujera/api-client";
import { Button, Alert, AlertDescription, Card, CardContent, CardHeader, CardTitle } from "@samofujera/ui";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

export function LibraryProductPage() {
  const params = useParams();
  const productId = params.productId as string;
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const filesQuery = useQuery({
    queryKey: ["library", productId, "files"],
    queryFn: () => libraryApi.getFiles(productId),
    enabled: Boolean(productId),
  });

  const mediaQuery = useQuery({
    queryKey: ["library", productId, "media"],
    queryFn: () => libraryApi.getMedia(productId),
    enabled: Boolean(productId),
  });

  const eventQuery = useQuery({
    queryKey: ["library", productId, "event"],
    queryFn: () => libraryApi.getEvent(productId),
    enabled: Boolean(productId),
  });

  const downloadMutation = useMutation({
    mutationFn: (fileId: string) => libraryApi.download(fileId),
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

  const files = filesQuery.data?.data ?? [];
  const mediaItems = mediaQuery.data?.data?.items ?? [];
  const eventAccess = eventQuery.data?.data ?? null;

  const isLoading = filesQuery.isLoading && mediaQuery.isLoading && eventQuery.isLoading;
  const hasFiles = files.length > 0;
  const hasMedia = mediaItems.length > 0;
  const hasEvent = eventAccess !== null;

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/muj-ucet/knihovna")}
        >
          Zpět na knihovnu
        </Button>
        <h2 className="text-2xl font-bold">Obsah produktu</h2>
      </div>

      {errorMessage && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-lg border border-[var(--border)] bg-[var(--card)]"
            />
          ))}
        </div>
      )}

      {/* EBOOK: Downloadable files */}
      {hasFiles && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Soubory ke stažení</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--card)] p-4"
                >
                  <div className="flex items-center gap-4">
                    <span className="rounded-md bg-[var(--accent)] px-2.5 py-1 text-xs font-semibold text-[var(--accent-foreground)]">
                      {file.mimeType.split("/").pop()?.toUpperCase() ?? "FILE"}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{file.fileName}</p>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        {formatFileSize(file.fileSizeBytes)}
                      </p>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    disabled={downloadMutation.isPending}
                    onClick={() => downloadMutation.mutate(file.id)}
                  >
                    Stáhnout
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* AUDIO_VIDEO: Media list */}
      {hasMedia && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Media</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mediaItems.map((media) => (
                <div
                  key={media.id}
                  className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--card)] p-4"
                >
                  <div className="flex items-center gap-4">
                    <span className="rounded-md bg-[var(--accent)] px-2.5 py-1 text-xs font-semibold text-[var(--accent-foreground)]">
                      {media.mediaType}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{media.title}</p>
                      {media.durationSeconds != null && (
                        <p className="text-xs text-[var(--muted-foreground)]">
                          {formatDuration(media.durationSeconds)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Events: Event access */}
      {hasEvent && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Událost</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {eventAccess.venue && (
                <p className="text-sm">
                  <span className="font-medium">Místo:</span> {eventAccess.venue}
                </p>
              )}
              {eventAccess.isOnline && eventAccess.streamUrl && (
                <p className="text-sm">
                  <span className="font-medium">Stream:</span>{" "}
                  <a
                    href={eventAccess.streamUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--primary)] hover:underline"
                  >
                    Otevřít stream
                  </a>
                </p>
              )}
              {eventAccess.occurrences.length > 0 && (
                <div>
                  <p className="mb-2 text-sm font-medium">Termíny:</p>
                  <div className="space-y-2">
                    {eventAccess.occurrences.map((occ) => (
                      <div
                        key={occ.id}
                        className="flex items-center justify-between rounded-md border border-[var(--border)] p-3"
                      >
                        <div>
                          <p className="text-sm">
                            {new Date(occ.startsAt).toLocaleString("cs-CZ")} --{" "}
                            {new Date(occ.endsAt).toLocaleTimeString("cs-CZ")}
                          </p>
                          <p className="text-xs text-[var(--muted-foreground)]">
                            {occ.status}
                          </p>
                        </div>
                        {occ.streamUrl && (
                          <a
                            href={occ.streamUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-[var(--primary)] hover:underline"
                          >
                            Stream
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No content found */}
      {!isLoading && !hasFiles && !hasMedia && !hasEvent && (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
          <p className="text-[var(--muted-foreground)]">
            Pro tento produkt není dostupný žádný obsah.
          </p>
        </div>
      )}
    </div>
  );
}
