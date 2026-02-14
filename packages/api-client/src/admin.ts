import { apiFetch } from "./client";
import type {
  ApiResponse,
  ProductResponse,
  ProductListResponse,
  CategoryResponse,
  CreateProductRequest,
  UpdateProductRequest,
  CreateCategoryRequest,
  UpdateCategoryRequest,
  OrderListResponse,
  OrderResponse,
  ShippingResponse,
  UpdateShippingRequest,
  AssetResponse,
} from "./types";

export const adminApi = {
  // Products

  getProducts: (params?: {
    page?: number;
    limit?: number;
    status?: string;
    category?: string;
    type?: string;
    search?: string;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    if (params?.status) searchParams.set("status", params.status);
    if (params?.category) searchParams.set("category", params.category);
    if (params?.type) searchParams.set("type", params.type);
    if (params?.search) searchParams.set("search", params.search);
    const qs = searchParams.toString();
    return apiFetch<ApiResponse<ProductListResponse>>(
      `/api/admin/products${qs ? `?${qs}` : ""}`,
    );
  },

  createProduct: (data: CreateProductRequest) =>
    apiFetch<ApiResponse<ProductResponse>>("/api/admin/products", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateProduct: (id: string, data: UpdateProductRequest) =>
    apiFetch<ApiResponse<ProductResponse>>(`/api/admin/products/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteProduct: (id: string) =>
    apiFetch<void>(`/api/admin/products/${id}`, { method: "DELETE" }),

  // Assets

  uploadAsset: (productId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return apiFetch<ApiResponse<AssetResponse>>(
      `/api/admin/products/${productId}/assets`,
      {
        method: "POST",
        body: formData,
      },
    );
  },

  deleteAsset: (productId: string, assetId: string) =>
    apiFetch<void>(
      `/api/admin/products/${productId}/assets/${assetId}`,
      { method: "DELETE" },
    ),

  // Categories

  createCategory: (data: CreateCategoryRequest) =>
    apiFetch<ApiResponse<CategoryResponse>>("/api/admin/categories", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateCategory: (id: string, data: UpdateCategoryRequest) =>
    apiFetch<ApiResponse<CategoryResponse>>(
      `/api/admin/categories/${id}`,
      {
        method: "PUT",
        body: JSON.stringify(data),
      },
    ),

  deleteCategory: (id: string) =>
    apiFetch<void>(`/api/admin/categories/${id}`, { method: "DELETE" }),

  // Orders

  getOrders: (params?: { page?: number; limit?: number; status?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    if (params?.status) searchParams.set("status", params.status);
    const qs = searchParams.toString();
    return apiFetch<ApiResponse<OrderListResponse>>(
      `/api/admin/orders${qs ? `?${qs}` : ""}`,
    );
  },

  getOrder: (id: string) =>
    apiFetch<ApiResponse<OrderResponse>>(`/api/admin/orders/${id}`),

  updateShipping: (orderId: string, data: UpdateShippingRequest) =>
    apiFetch<ApiResponse<ShippingResponse>>(
      `/api/admin/orders/${orderId}/shipping`,
      {
        method: "PUT",
        body: JSON.stringify(data),
      },
    ),
};
