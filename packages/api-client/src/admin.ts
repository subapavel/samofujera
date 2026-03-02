import { apiFetch, BASE_URL } from "./client";
import type {
  ApiResponse,
  ProductResponse,
  ProductDetailResponse,
  ProductListResponse,
  CategoryResponse,
  CreateProductRequest,
  UpdateProductRequest,
  CreateCategoryRequest,
  UpdateCategoryRequest,
  CreateVariantRequest,
  OrderListResponse,
  OrderResponse,
  ShippingResponse,
  UpdateShippingRequest,
  ProductImageResponse,
  VariantResponse,
  EmailTemplateListItem,
  UpdateEmailOverrideRequest,
  EmailDefaultSubjectsResponse,
  EmailCurrentOverrideResponse,
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

  getProduct: (id: string) =>
    apiFetch<ApiResponse<ProductDetailResponse>>(`/api/admin/products/${id}`),

  createProduct: (data: CreateProductRequest) =>
    apiFetch<ApiResponse<ProductResponse>>("/api/admin/products", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  createDraft: (productType: string) =>
    apiFetch<ApiResponse<ProductResponse>>("/api/admin/products/draft", {
      method: "POST",
      body: JSON.stringify({ productType }),
    }),

  updateProduct: (id: string, data: UpdateProductRequest) =>
    apiFetch<ApiResponse<ProductResponse>>(`/api/admin/products/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteProduct: (id: string) =>
    apiFetch<void>(`/api/admin/products/${id}`, { method: "DELETE" }),

  deleteProducts: (ids: string[]) =>
    apiFetch<void>("/api/admin/products/bulk", {
      method: "DELETE",
      body: JSON.stringify({ ids }),
    }),

  // Images (linked via image library)

  linkImage: (productId: string, imageId: string) =>
    apiFetch<ApiResponse<ProductImageResponse>>(
      `/api/admin/products/${productId}/images`,
      {
        method: "POST",
        body: JSON.stringify({ imageId }),
      },
    ),

  unlinkImage: (productId: string, imageId: string) =>
    apiFetch<void>(
      `/api/admin/products/${productId}/images/${imageId}`,
      { method: "DELETE" },
    ),

  reorderImages: (productId: string, imageIds: string[]) =>
    apiFetch<void>(
      `/api/admin/products/${productId}/images/reorder`,
      {
        method: "PUT",
        body: JSON.stringify({ imageIds }),
      },
    ),

  // Variants

  createVariant: (productId: string, data: CreateVariantRequest) =>
    apiFetch<ApiResponse<VariantResponse>>(
      `/api/admin/products/${productId}/variants`,
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    ),

  updateVariant: (productId: string, variantId: string, data: CreateVariantRequest) =>
    apiFetch<ApiResponse<VariantResponse>>(
      `/api/admin/products/${productId}/variants/${variantId}`,
      {
        method: "PUT",
        body: JSON.stringify(data),
      },
    ),

  deleteVariant: (productId: string, variantId: string) =>
    apiFetch<void>(
      `/api/admin/products/${productId}/variants/${variantId}`,
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

  getCategory: (id: string) =>
    apiFetch<ApiResponse<CategoryResponse>>(`/api/admin/categories/${id}`),

  deleteCategory: (id: string) =>
    apiFetch<void>(`/api/admin/categories/${id}`, { method: "DELETE" }),

  reorderCategories: (categoryIds: string[]) =>
    apiFetch<void>("/api/admin/categories/reorder", {
      method: "PUT",
      body: JSON.stringify({ categoryIds }),
    }),

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

  // Email Templates

  getEmailTemplates: () =>
    apiFetch<EmailTemplateListItem[]>("/api/admin/email-templates"),

  getEmailTemplatePreview: (key: string, locale: "cs" | "sk") =>
    apiFetch<string>(
      `/api/admin/email-templates/${key}/preview?locale=${locale}`,
    ),

  updateEmailOverride: (key: string, data: UpdateEmailOverrideRequest) =>
    apiFetch<void>(`/api/admin/email-templates/${key}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteEmailOverride: (key: string, locale: "cs" | "sk") =>
    apiFetch<void>(
      `/api/admin/email-templates/${key}?locale=${locale}`,
      { method: "DELETE" },
    ),

  getEmailDefaultSubjects: (key: string) =>
    apiFetch<EmailDefaultSubjectsResponse>(
      `/api/admin/email-templates/${key}/default-subject`,
    ),

  getEmailTemplateSource: async (key: string, locale: "cs" | "sk"): Promise<string> => {
    const res = await fetch(
      `${BASE_URL}/api/admin/email-templates/${key}/source?locale=${locale}`,
      { credentials: "include" },
    );
    if (!res.ok) throw new Error("Failed to fetch template source");
    return res.text();
  },

  getEmailCurrentOverride: (key: string, locale: "cs" | "sk") =>
    apiFetch<EmailCurrentOverrideResponse>(
      `/api/admin/email-templates/${key}/current-override?locale=${locale}`,
    ),

  sendTestEmail: (key: string, locale: "cs" | "sk") =>
    apiFetch<void>(
      `/api/admin/email-templates/${key}/test?locale=${locale}`,
      { method: "POST" },
    ),
};
