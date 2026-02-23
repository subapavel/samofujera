import { apiFetch, BASE_URL } from "./client";
import type {
  ApiResponse,
  ImageDetailResponse,
  ImageListResponse,
  UpdateImageRequest,
} from "./types";

export const imageApi = {
  getImages: (params?: {
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
    return apiFetch<ApiResponse<ImageListResponse>>(
      `/api/admin/images${qs ? `?${qs}` : ""}`,
    );
  },

  getImage: (id: string) =>
    apiFetch<ApiResponse<ImageDetailResponse>>(`/api/admin/images/${id}`),

  uploadDirect: (file: File, altText?: string, title?: string, isPublic?: boolean) => {
    const formData = new FormData();
    formData.append("file", file);
    if (altText) formData.append("altText", altText);
    if (title) formData.append("title", title);
    const qs = isPublic ? "?public=true" : "";
    return apiFetch<ApiResponse<ImageDetailResponse>>(
      `/api/admin/images/upload${qs}`,
      { method: "POST", body: formData },
    );
  },

  updateImage: (id: string, data: UpdateImageRequest) =>
    apiFetch<ApiResponse<ImageDetailResponse>>(`/api/admin/images/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  deleteImage: (id: string) =>
    apiFetch<void>(`/api/admin/images/${id}`, { method: "DELETE" }),

  uploadWithProgress: (
    file: File,
    onProgress: (percent: number) => void,
    altText?: string,
    title?: string,
    isPublic?: boolean,
  ): { promise: Promise<ApiResponse<ImageDetailResponse>>; abort: () => void } => {
    const xhr = new XMLHttpRequest();
    const promise = new Promise<ApiResponse<ImageDetailResponse>>(
      (resolve, reject) => {
        const formData = new FormData();
        formData.append("file", file);
        if (altText) formData.append("altText", altText);
        if (title) formData.append("title", title);

        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            onProgress(Math.round((e.loaded / e.total) * 100));
          }
        });

        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText) as ApiResponse<ImageDetailResponse>);
          } else {
            reject(new Error(`Upload failed: ${xhr.status}`));
          }
        });

        xhr.addEventListener("error", () => reject(new Error("Upload failed")));
        xhr.addEventListener("abort", () => reject(new Error("Upload cancelled")));

        const qs = isPublic ? "?public=true" : "";
        xhr.open("POST", `${BASE_URL}/api/admin/images/upload${qs}`);
        xhr.withCredentials = true;
        xhr.send(formData);
      },
    );

    return { promise, abort: () => xhr.abort() };
  },
};
