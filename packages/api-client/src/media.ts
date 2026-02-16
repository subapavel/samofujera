import { apiFetch } from "./client";
import type {
  ApiResponse,
  MediaFolderResponse,
  MediaItemResponse,
  MediaItemListResponse,
  TempUploadResponse,
  CreateMediaFolderRequest,
  RenameMediaFolderRequest,
  CreateMediaItemRequest,
  UpdateMediaItemRequest,
} from "./types";

const BASE_URL = import.meta.env?.PUBLIC_API_URL ?? "http://localhost:8080";

export const mediaApi = {
  getFolders: () =>
    apiFetch<ApiResponse<MediaFolderResponse[]>>("/api/admin/media/folders"),

  createFolder: (data: CreateMediaFolderRequest) =>
    apiFetch<ApiResponse<MediaFolderResponse>>("/api/admin/media/folders", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  renameFolder: (id: string, data: RenameMediaFolderRequest) =>
    apiFetch<ApiResponse<MediaFolderResponse>>(`/api/admin/media/folders/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteFolder: (id: string) =>
    apiFetch<void>(`/api/admin/media/folders/${id}`, { method: "DELETE" }),

  getItems: (params?: {
    folderId?: string;
    type?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.folderId) searchParams.set("folderId", params.folderId);
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

  uploadTemp: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return apiFetch<ApiResponse<TempUploadResponse>>(
      "/api/admin/media/upload-temp",
      { method: "POST", body: formData },
    );
  },

  uploadDirect: (file: File, folderId?: string, altText?: string) => {
    const formData = new FormData();
    formData.append("file", file);
    if (folderId) formData.append("folderId", folderId);
    if (altText) formData.append("altText", altText);
    return apiFetch<ApiResponse<MediaItemResponse>>(
      "/api/admin/media/upload",
      { method: "POST", body: formData },
    );
  },

  createItem: (data: CreateMediaItemRequest) =>
    apiFetch<ApiResponse<MediaItemResponse>>("/api/admin/media", {
      method: "POST",
      body: JSON.stringify(data),
    }),

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
    folderId?: string,
    altText?: string,
  ): { promise: Promise<ApiResponse<MediaItemResponse>>; abort: () => void } => {
    const xhr = new XMLHttpRequest();
    const promise = new Promise<ApiResponse<MediaItemResponse>>(
      (resolve, reject) => {
        const formData = new FormData();
        formData.append("file", file);
        if (folderId) formData.append("folderId", folderId);
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
