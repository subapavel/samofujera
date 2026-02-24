import { apiFetch } from "./client";
import type {
  ApiResponse,
  PageListResponse,
  PageDetailResponse,
  CreatePageRequest,
  UpdatePageRequest,
  SchedulePublishRequest,
  PublicPageResponse,
  RevisionResponse,
} from "./types";

export const pageAdminApi = {
  getPages: (params?: {
    page?: number;
    limit?: number;
    status?: string;
    type?: string;
    search?: string;
  }) => {
    const sp = new URLSearchParams();
    if (params?.page) sp.set("page", String(params.page));
    if (params?.limit) sp.set("limit", String(params.limit));
    if (params?.status) sp.set("status", params.status);
    if (params?.type) sp.set("type", params.type);
    if (params?.search) sp.set("search", params.search);
    const qs = sp.toString();
    return apiFetch<ApiResponse<PageListResponse>>(
      `/api/admin/pages${qs ? `?${qs}` : ""}`,
    );
  },

  getPage: (id: string) =>
    apiFetch<ApiResponse<PageDetailResponse>>(`/api/admin/pages/${id}`),

  createPage: (data: CreatePageRequest) =>
    apiFetch<ApiResponse<PageDetailResponse>>("/api/admin/pages", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updatePage: (id: string, data: UpdatePageRequest) =>
    apiFetch<ApiResponse<PageDetailResponse>>(`/api/admin/pages/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  publishPage: (id: string) =>
    apiFetch<void>(`/api/admin/pages/${id}/publish`, { method: "PUT" }),

  unpublishPage: (id: string) =>
    apiFetch<void>(`/api/admin/pages/${id}/unpublish`, { method: "PUT" }),

  schedulePage: (id: string, data: SchedulePublishRequest) =>
    apiFetch<void>(`/api/admin/pages/${id}/schedule`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  cancelSchedule: (id: string) =>
    apiFetch<void>(`/api/admin/pages/${id}/schedule/cancel`, { method: "PUT" }),

  deletePage: (id: string) =>
    apiFetch<void>(`/api/admin/pages/${id}`, { method: "DELETE" }),

  getRevisions: (pageId: string) =>
    apiFetch<ApiResponse<RevisionResponse[]>>(
      `/api/admin/pages/${pageId}/revisions`,
    ),

  restoreRevision: (pageId: string, revisionId: string) =>
    apiFetch<ApiResponse<PageDetailResponse>>(
      `/api/admin/pages/${pageId}/revisions/${revisionId}/restore`,
      { method: "POST" },
    ),
};

export const pagePublicApi = {
  getPage: (slug: string) =>
    apiFetch<ApiResponse<PublicPageResponse>>(`/api/pages/${slug}`),
  getPagePreview: (slug: string) =>
    apiFetch<ApiResponse<PublicPageResponse>>(`/api/pages/${slug}?preview=true`),
};
