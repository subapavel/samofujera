import { apiFetch, BASE_URL } from "./client";
import type {
  ApiResponse,
  MediaItemResponse,
  MediaItemListResponse,
  UpdateMediaItemRequest,
} from "./types";

export const mediaApi = {
  getItems: (params?: {
    source?: string;
    type?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.source) searchParams.set("source", params.source);
    if (params?.type) searchParams.set("type", params.type);
    if (params?.search) searchParams.set("search", params.search);
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    const qs = searchParams.toString();
    return apiFetch<ApiResponse<MediaItemListResponse>>(
      `/api/admin/media${qs ? `?${qs}` : ""}`,
    );
  },

  getItem: (id: string) =>
    apiFetch<ApiResponse<MediaItemResponse>>(`/api/admin/media/${id}`),

  uploadDirect: (file: File, altText?: string) => {
    const formData = new FormData();
    formData.append("file", file);
    if (altText) formData.append("altText", altText);
    return apiFetch<ApiResponse<MediaItemResponse>>(
      "/api/admin/media/upload",
      { method: "POST", body: formData },
    );
  },

  updateItem: (id: string, data: UpdateMediaItemRequest) =>
    apiFetch<ApiResponse<MediaItemResponse>>(`/api/admin/media/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  deleteItem: (id: string) =>
    apiFetch<void>(`/api/admin/media/${id}`, { method: "DELETE" }),

  uploadWithProgress: (
    file: File,
    onProgress: (percent: number) => void,
    altText?: string,
  ): { promise: Promise<ApiResponse<MediaItemResponse>>; abort: () => void } => {
    const xhr = new XMLHttpRequest();
    const promise = new Promise<ApiResponse<MediaItemResponse>>(
      (resolve, reject) => {
        const formData = new FormData();
        formData.append("file", file);
        if (altText) formData.append("altText", altText);

        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            onProgress(Math.round((e.loaded / e.total) * 100));
          }
        });

        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(
              JSON.parse(xhr.responseText) as ApiResponse<MediaItemResponse>,
            );
          } else {
            reject(new Error(`Upload failed: ${xhr.status}`));
          }
        });

        xhr.addEventListener("error", () => reject(new Error("Upload failed")));
        xhr.addEventListener("abort", () => reject(new Error("Upload cancelled")));

        xhr.open("POST", `${BASE_URL}/api/admin/media/upload`);
        xhr.withCredentials = true;
        xhr.send(formData);
      },
    );

    return { promise, abort: () => xhr.abort() };
  },
};
