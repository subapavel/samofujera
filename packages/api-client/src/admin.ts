import { apiFetch } from "./client";
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
  FileResponse,
  ImageResponse,
  MediaResponse,
  CreateMediaRequest,
  VariantResponse,
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

  updateProduct: (id: string, data: UpdateProductRequest) =>
    apiFetch<ApiResponse<ProductResponse>>(`/api/admin/products/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteProduct: (id: string) =>
    apiFetch<void>(`/api/admin/products/${id}`, { method: "DELETE" }),

  // Images

  uploadImage: (productId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return apiFetch<ApiResponse<ImageResponse>>(
      `/api/admin/products/${productId}/images`,
      {
        method: "POST",
        body: formData,
      },
    );
  },

  deleteImage: (productId: string, imageId: string) =>
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

  updateImageAltText: (productId: string, imageId: string, altText: string) =>
    apiFetch<void>(
      `/api/admin/products/${productId}/images/${imageId}/alt-text`,
      {
        method: "PATCH",
        body: JSON.stringify({ altText }),
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

  // Files (EBOOK)

  uploadFile: (productId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return apiFetch<ApiResponse<FileResponse>>(
      `/api/admin/products/${productId}/files`,
      {
        method: "POST",
        body: formData,
      },
    );
  },

  deleteFile: (productId: string, fileId: string) =>
    apiFetch<void>(
      `/api/admin/products/${productId}/files/${fileId}`,
      { method: "DELETE" },
    ),

  // Media (AUDIO_VIDEO)

  getMedia: (productId: string) =>
    apiFetch<ApiResponse<MediaResponse[]>>(
      `/api/admin/products/${productId}/media`,
    ),

  createMedia: (productId: string, data: CreateMediaRequest) =>
    apiFetch<ApiResponse<MediaResponse>>(
      `/api/admin/products/${productId}/media`,
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    ),

  deleteMedia: (productId: string, mediaId: string) =>
    apiFetch<void>(
      `/api/admin/products/${productId}/media/${mediaId}`,
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
