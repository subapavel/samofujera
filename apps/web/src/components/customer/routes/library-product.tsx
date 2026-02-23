"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { t } from "@lingui/core/macro";
import { ArrowLeft, Download, Loader2, Play, Video } from "lucide-react";
import { libraryApi, ApiError } from "@samofujera/api-client";
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@samofujera/ui";

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
            t`Příliš mnoho stažení. Zkuste to prosím za hodinu.`,
          );
        } else if (error.status === 403) {
          setErrorMessage(t`K tomuto produktu nemáte přístup.`);
        } else {
          setErrorMessage(t`Nepodařilo se stáhnout soubor. Zkuste to znovu.`);
        }
      } else {
        setErrorMessage(t`Nepodařilo se stáhnout soubor. Zkuste to znovu.`);
      }
    },
  });

  const files = filesQuery.data?.data ?? [];
  const mediaItems = mediaQuery.data?.data?.items ?? [];
  const eventAccess = eventQuery.data?.data ?? null;

  const isLoading =
    filesQuery.isLoading && mediaQuery.isLoading && eventQuery.isLoading;
  const hasFiles = files.length > 0;
  const hasMedia = mediaItems.length > 0;
  const hasEvent = eventAccess !== null;

  return (
    <div className="flex flex-1 flex-col gap-4 sm:gap-6">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/muj-ucet/knihovna")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t`Zpět`}
        </Button>
        <h2 className="text-2xl font-bold tracking-tight">
          {t`Obsah produktu`}
        </h2>
      </div>

      {errorMessage && (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {hasFiles && (
        <Card>
          <CardHeader>
            <CardTitle>{t`Soubory ke stažení`}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-center gap-4">
                    <Badge variant="secondary">
                      {file.mimeType.split("/").pop()?.toUpperCase() ?? "FILE"}
                    </Badge>
                    <div>
                      <p className="text-sm font-medium">{file.fileName}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(file.fileSizeBytes)}
                      </p>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    disabled={downloadMutation.isPending}
                    onClick={() => downloadMutation.mutate(file.id)}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    {t`Stáhnout`}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {hasMedia && (
        <Card>
          <CardHeader>
            <CardTitle>{t`Média`}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mediaItems.map((media) => (
                <div
                  key={media.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-center gap-4">
                    {media.mediaType === "VIDEO" ? (
                      <Video className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <Play className="h-5 w-5 text-muted-foreground" />
                    )}
                    <div>
                      <p className="text-sm font-medium">{media.title}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{media.mediaType}</Badge>
                        {media.durationSeconds != null && (
                          <span className="text-xs text-muted-foreground">
                            {formatDuration(media.durationSeconds)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {hasEvent && (
        <Card>
          <CardHeader>
            <CardTitle>{t`Událost`}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {eventAccess.venue && (
                <div className="text-sm">
                  <p className="font-medium text-muted-foreground">
                    {t`Místo`}
                  </p>
                  <p>{eventAccess.venue}</p>
                </div>
              )}
              {eventAccess.isOnline && eventAccess.streamUrl && (
                <div className="text-sm">
                  <p className="font-medium text-muted-foreground">Stream</p>
                  <a
                    href={eventAccess.streamUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {t`Otevřít stream`}
                  </a>
                </div>
              )}
              {eventAccess.occurrences.length > 0 && (
                <div>
                  <p className="mb-2 text-sm font-medium text-muted-foreground">
                    {t`Termíny`}
                  </p>
                  <div className="space-y-2">
                    {eventAccess.occurrences.map((occ) => (
                      <div
                        key={occ.id}
                        className="flex items-center justify-between rounded-md border p-3"
                      >
                        <div>
                          <p className="text-sm">
                            {new Date(occ.startsAt).toLocaleString("cs-CZ")}{" "}
                            &ndash;{" "}
                            {new Date(occ.endsAt).toLocaleTimeString("cs-CZ")}
                          </p>
                          <Badge variant="outline" className="mt-1">
                            {occ.status}
                          </Badge>
                        </div>
                        {occ.streamUrl && (
                          <a
                            href={occ.streamUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline"
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

      {!isLoading && !hasFiles && !hasMedia && !hasEvent && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {t`Pro tento produkt není dostupný žádný obsah.`}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
