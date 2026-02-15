import { apiFetch } from "./client";
import type {
  ApiResponse,
  LibraryItem,
  FileResponse,
  DownloadResponse,
  StreamResponse,
  EventAccessResponse,
} from "./types";

export const libraryApi = {
  getLibrary: () =>
    apiFetch<ApiResponse<LibraryItem[]>>("/api/library"),

  getFiles: (productId: string) =>
    apiFetch<ApiResponse<FileResponse[]>>(
      `/api/library/${productId}/files`,
    ),

  getMedia: (productId: string) =>
    apiFetch<ApiResponse<StreamResponse>>(
      `/api/library/${productId}/media`,
    ),

  getEvent: (productId: string) =>
    apiFetch<ApiResponse<EventAccessResponse>>(
      `/api/library/${productId}/event`,
    ),

  download: (fileId: string) =>
    apiFetch<ApiResponse<DownloadResponse>>(
      `/api/delivery/${fileId}/download`,
    ),
};
