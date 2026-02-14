import { apiFetch } from "./client";
import type {
  ApiResponse,
  CategoryResponse,
  ProductListResponse,
  ProductDetailResponse,
} from "./types";

export const catalogApi = {
  getCategories: () =>
    apiFetch<ApiResponse<CategoryResponse[]>>("/api/catalog/categories"),

  getProducts: (params?: {
    page?: number;
    limit?: number;
    category?: string;
    type?: string;
    search?: string;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    if (params?.category) searchParams.set("category", params.category);
    if (params?.type) searchParams.set("type", params.type);
    if (params?.search) searchParams.set("search", params.search);
    const qs = searchParams.toString();
    return apiFetch<ApiResponse<ProductListResponse>>(
      `/api/catalog/products${qs ? `?${qs}` : ""}`,
    );
  },

  getProduct: (slug: string) =>
    apiFetch<ApiResponse<ProductDetailResponse>>(
      `/api/catalog/products/${slug}`,
    ),
};
