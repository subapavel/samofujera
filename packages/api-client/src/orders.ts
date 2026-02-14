import { apiFetch } from "./client";
import type { ApiResponse, OrderResponse, OrderListResponse } from "./types";

export const ordersApi = {
  getMyOrders: (params?: { page?: number; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    const qs = searchParams.toString();
    return apiFetch<ApiResponse<OrderListResponse>>(
      `/api/orders${qs ? `?${qs}` : ""}`,
    );
  },

  getOrder: (id: string) =>
    apiFetch<ApiResponse<OrderResponse>>(`/api/orders/${id}`),
};
