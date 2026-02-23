import { apiFetch } from "./client";
import type { ApiResponse } from "./types";

export interface ContentResponse {
  id: string;
  productId: string;
  contentType: string;
  title: string;
  isPreview: boolean;
  originalFilename: string | null;
  mimeType: string | null;
  fileSizeBytes: number | null;
  streamUid: string | null;
  durationSeconds: number | null;
  sortOrder: number;
  createdAt: string;
}

export const productContentApi = {
  getContent: (productId: string) =>
    apiFetch<ApiResponse<ContentResponse[]>>(
      `/api/admin/products/${productId}/content`,
    ),

  uploadContent: (productId: string, file: File, title: string) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", title);
    return apiFetch<ApiResponse<ContentResponse>>(
      `/api/admin/products/${productId}/content/upload`,
      {
        method: "POST",
        body: formData,
      },
    );
  },

  linkStream: (
    productId: string,
    data: {
      title: string;
      contentType: string;
      streamUid: string;
      durationSeconds?: number;
    },
  ) =>
    apiFetch<ApiResponse<ContentResponse>>(
      `/api/admin/products/${productId}/content/stream`,
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    ),

  updateContent: (
    productId: string,
    contentId: string,
    data: { title?: string; isPreview?: boolean },
  ) =>
    apiFetch<ApiResponse<ContentResponse>>(
      `/api/admin/products/${productId}/content/${contentId}`,
      {
        method: "PATCH",
        body: JSON.stringify(data),
      },
    ),

  deleteContent: (productId: string, contentId: string) =>
    apiFetch<void>(
      `/api/admin/products/${productId}/content/${contentId}`,
      { method: "DELETE" },
    ),

  reorderContent: (productId: string, contentIds: string[]) =>
    apiFetch<void>(
      `/api/admin/products/${productId}/content/reorder`,
      {
        method: "PUT",
        body: JSON.stringify({ contentIds }),
      },
    ),
};
