import { apiFetch } from "./client";
import type {
  ApiResponse,
  LibraryItem,
  ContentResponse,
  DownloadResponse,
  EventAccessResponse,
} from "./types";

export const libraryApi = {
  getLibrary: () =>
    apiFetch<ApiResponse<LibraryItem[]>>("/api/library"),

  getContent: (productId: string) =>
    apiFetch<ApiResponse<ContentResponse[]>>(
      `/api/library/${productId}/content`,
    ),

  getEvent: (productId: string) =>
    apiFetch<ApiResponse<EventAccessResponse>>(
      `/api/library/${productId}/event`,
    ),

  download: (contentId: string) =>
    apiFetch<ApiResponse<DownloadResponse>>(
      `/api/delivery/${contentId}/download`,
    ),
};
