import { apiFetch } from "./client";
import type {
  ApiResponse,
  UserResponse,
  LoginRequest,
  RegisterRequest,
} from "./types";

export const authApi = {
  register: (data: RegisterRequest) =>
    apiFetch<ApiResponse<UserResponse>>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  login: (data: LoginRequest) =>
    apiFetch<ApiResponse<UserResponse>>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  logout: () => apiFetch<void>("/api/auth/logout", { method: "POST" }),
  forgotPassword: (email: string) =>
    apiFetch<ApiResponse<string>>("/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
  resetPassword: (token: string, newPassword: string) =>
    apiFetch<ApiResponse<string>>("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, newPassword }),
    }),
};
