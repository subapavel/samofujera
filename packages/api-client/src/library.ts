import { apiFetch } from "./client";
import type {
  ApiResponse,
  LibraryItem,
  AssetResponse,
  DownloadResponse,
} from "./types";

export const libraryApi = {
  getLibrary: () =>
    apiFetch<ApiResponse<LibraryItem[]>>("/api/library"),

  getAssets: (productId: string) =>
    apiFetch<ApiResponse<AssetResponse[]>>(
      `/api/library/${productId}/assets`,
    ),

  download: (assetId: string) =>
    apiFetch<ApiResponse<DownloadResponse>>(
      `/api/delivery/download/${assetId}`,
    ),
};
