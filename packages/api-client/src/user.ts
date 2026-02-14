import { apiFetch } from "./client";
import type {
  ApiResponse,
  ProfileResponse,
  UpdateProfileRequest,
  SessionResponse,
} from "./types";

export const userApi = {
  getProfile: () => apiFetch<ApiResponse<ProfileResponse>>("/api/me"),
  updateProfile: (data: UpdateProfileRequest) =>
    apiFetch<ApiResponse<ProfileResponse>>("/api/me", {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  updateLocale: (locale: string) =>
    apiFetch<void>("/api/me/locale", {
      method: "PUT",
      body: JSON.stringify({ locale }),
    }),
  getSessions: () =>
    apiFetch<ApiResponse<SessionResponse[]>>("/api/me/sessions"),
  revokeSession: (sessionId: string) =>
    apiFetch<void>(`/api/me/sessions/${sessionId}`, { method: "DELETE" }),
  deleteAccount: (password: string) =>
    apiFetch<void>("/api/me", {
      method: "DELETE",
      body: JSON.stringify({ password }),
    }),
};
