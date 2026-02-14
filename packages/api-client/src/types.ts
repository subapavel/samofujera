export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface UserResponse {
  id: string;
  email: string;
  name: string;
  role: string;
  locale: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  deviceFingerprint?: string;
  force?: boolean;
}

export interface SessionResponse {
  sessionId: string;
  deviceName: string;
  ipAddress: string;
  lastActiveAt: string;
  current: boolean;
}

export interface ProfileResponse {
  id: string;
  email: string;
  name: string;
  role: string;
  locale: string;
  avatarUrl: string | null;
}

export interface UpdateProfileRequest {
  name: string;
  avatarUrl?: string;
}

export interface SessionConflictResponse {
  conflict: boolean;
  existingDevice: string;
  sessionId: string;
}

// Catalog

export interface CategoryResponse {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  sortOrder: number;
  children: CategoryResponse[];
}

export interface ProductResponse {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  shortDescription: string | null;
  productType: string;
  priceAmount: number;
  priceCurrency: string;
  status: string;
  thumbnailUrl: string | null;
  categoryId: string | null;
  categoryName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProductListResponse {
  items: ProductResponse[];
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export interface AssetResponse {
  id: string;
  assetType: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  durationSeconds: number | null;
  sortOrder: number;
}

export interface ProductDetailResponse extends ProductResponse {
  assets: AssetResponse[];
}

// Orders

export interface OrderItemResponse {
  id: string;
  productId: string;
  productTitle: string;
  productType: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  thumbnailUrl: string | null;
}

export interface ShippingResponse {
  carrier: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
}

export interface OrderResponse {
  id: string;
  status: string;
  totalAmount: number;
  currency: string;
  discountAmount: number;
  items: OrderItemResponse[];
  shipping: ShippingResponse | null;
  createdAt: string;
}

export interface OrderListResponse {
  items: OrderResponse[];
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export interface CheckoutRequest {
  items: { productId: string; quantity: number }[];
  voucherCode?: string;
}

export interface CheckoutResponse {
  checkoutUrl: string;
  orderId: string;
}

// Library

export interface LibraryItem {
  productId: string;
  productTitle: string;
  productType: string;
  thumbnailUrl: string | null;
  grantedAt: string;
}

export interface DownloadResponse {
  downloadUrl: string;
  fileName: string;
  fileSize: number;
}

// Admin

export interface CreateProductRequest {
  title: string;
  slug: string;
  description?: string;
  shortDescription?: string;
  productType: string;
  priceAmount: number;
  priceCurrency?: string;
  thumbnailUrl?: string;
  categoryId?: string;
}

export interface UpdateProductRequest extends CreateProductRequest {
  status: string;
}

export interface CreateCategoryRequest {
  name: string;
  slug: string;
  parentId?: string;
  sortOrder: number;
}

export interface UpdateCategoryRequest extends CreateCategoryRequest {}

export interface UpdateShippingRequest {
  carrier?: string;
  trackingNumber?: string;
  trackingUrl?: string;
}
