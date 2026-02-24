import { apiFetch } from "./client";
import type { ApiResponse, ImpersonationStatus } from "./types";

export const impersonationApi = {
  start: (userId: string) =>
    apiFetch<ApiResponse<void>>(`/api/admin/impersonate/${userId}`, {
      method: "POST",
    }),
  stop: () =>
    apiFetch<ApiResponse<void>>("/api/admin/impersonate/stop", {
      method: "POST",
    }),
  getStatus: () =>
    apiFetch<ApiResponse<ImpersonationStatus>>("/api/admin/impersonate/status"),
};
