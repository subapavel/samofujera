export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface UserResponse {
  id: string;
  email: string;
  name: string;
  roles: string[];
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
  roles: string[];
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
  description: string | null;
  imageMediaId: string | null;
  imageUrl: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  sortOrder: number;
}

export interface CategorySummary {
  id: string;
  name: string;
  slug: string;
}

export type ProductType =
  | "PHYSICAL"
  | "EBOOK"
  | "AUDIO_VIDEO"
  | "ONLINE_EVENT"
  | "RECURRING_EVENT"
  | "OFFLINE_EVENT";

export interface ProductResponse {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  shortDescription: string | null;
  productType: ProductType;
  prices: Record<string, number>;
  status: string;
  thumbnailUrl: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  categories: CategorySummary[];
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

export interface VariantResponse {
  id: string;
  name: string;
  sku: string;
  stock: number;
  sortOrder: number;
  prices: Record<string, number>;
}

export interface ContentResponse {
  id: string;
  productId: string;
  contentType: string;
  title: string;
  isPreview: boolean;
  originalFilename: string | null;
  mimeType: string | null;
  fileSizeBytes: number | null;
  streamUid: string | null;
  durationSeconds: number | null;
  sortOrder: number;
  createdAt: string;
}

/** @deprecated Use ContentResponse instead */
export interface FileResponse {
  id: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  sortOrder: number;
}

/** @deprecated Use ContentResponse instead */
export interface MediaResponse {
  id: string;
  title: string;
  mediaType: "VIDEO" | "AUDIO";
  cfStreamUid: string | null;
  durationSeconds: number | null;
  sortOrder: number;
}

export interface EventResponse {
  id: string;
  venue: string | null;
  capacity: number | null;
  isOnline: boolean;
  streamUrl: string | null;
  recordingProductId: string | null;
}

export interface OccurrenceResponse {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  streamUrl: string | null;
}

export interface ProductImageResponse {
  imageId: string;
  url: string;
  altText: string | null;
  panX: number;
  panY: number;
  sortOrder: number;
}

export interface ProductDetailResponse extends ProductResponse {
  images: ProductImageResponse[];
  variants: VariantResponse[] | null;
  content: ContentResponse[] | null;
  event: EventResponse | null;
  occurrences: OccurrenceResponse[] | null;
}

// Orders

export interface OrderItemResponse {
  id: string;
  productId: string;
  variantId: string | null;
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
  items: { productId: string; variantId?: string; quantity: number }[];
  currency?: string;
}

export interface CheckoutResponse {
  checkoutUrl: string;
  orderId: string;
}

// Library

export interface LibraryItem {
  productId: string;
  productTitle: string;
  productType: ProductType;
  thumbnailUrl: string | null;
  grantedAt: string;
}

export interface DownloadResponse {
  downloadUrl: string;
  fileName: string;
  fileSize: number;
}

export interface StreamResponse {
  items: StreamItem[];
}

export interface StreamItem {
  id: string;
  title: string;
  mediaType: "VIDEO" | "AUDIO";
  cfStreamUid: string | null;
  durationSeconds: number | null;
  sortOrder: number;
}

export interface EventAccessResponse {
  eventId: string;
  venue: string | null;
  capacity: number | null;
  isOnline: boolean;
  streamUrl: string | null;
  occurrences: OccurrenceItem[];
}

export interface OccurrenceItem {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  streamUrl: string | null;
}

// Admin

export interface CreateVariantRequest {
  name: string;
  sku: string;
  stock: number;
  sortOrder: number;
  prices: Record<string, number>;
}

export interface CreateEventRequest {
  venue?: string;
  capacity?: number;
  isOnline: boolean;
  streamUrl?: string;
  recordingProductId?: string;
}

export interface CreateOccurrenceRequest {
  startsAt: string;
  endsAt: string;
  streamUrl?: string;
}

export interface CreateMediaRequest {
  title: string;
  mediaType: "VIDEO" | "AUDIO";
  cfStreamUid?: string;
  fileKey?: string;
  durationSeconds?: number;
  sortOrder: number;
}

export interface CreateProductRequest {
  title: string;
  slug: string;
  description?: string;
  shortDescription?: string;
  productType: ProductType;
  prices: Record<string, number>;
  thumbnailUrl?: string;
  categoryIds?: string[];
  metaTitle?: string;
  metaDescription?: string;
  variants?: CreateVariantRequest[];
  event?: CreateEventRequest;
  occurrences?: CreateOccurrenceRequest[];
  status?: string;
}

export interface UpdateProductRequest extends CreateProductRequest {
  status: string;
}

export interface CreateCategoryRequest {
  name: string;
  slug: string;
  description?: string;
  imageMediaId?: string;
  metaTitle?: string;
  metaDescription?: string;
}

export type UpdateCategoryRequest = CreateCategoryRequest;

export interface UpdateShippingRequest {
  carrier?: string;
  trackingNumber?: string;
  trackingUrl?: string;
}

// Image Library types

export interface ImageDetailResponse {
  id: string;
  url: string;
  originalFilename: string;
  mimeType: string;
  fileSizeBytes: number;
  width: number | null;
  height: number | null;
  title: string | null;
  altText: string | null;
  createdAt: string;
  usedIn: UsageInfo[];
}

export interface UsageInfo {
  entityType: string;
  entityId: string;
  entityName: string;
}

export interface ImageListResponse {
  items: ImageDetailResponse[];
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export interface UpdateImageRequest {
  title?: string;
  altText?: string;
}

// Pages

export interface PageResponse {
  id: string;
  slug: string;
  title: string;
  status: string;
  pageType: string;
  metaTitle: string | null;
  metaDescription: string | null;
  ogImageId: string | null;
  sortOrder: number;
  showInNav: boolean;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  scheduledPublishAt: string | null;
}

export interface PageDetailResponse extends PageResponse {
  content: Record<string, unknown> | null;
  metaKeywords: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  noindex: boolean;
  nofollow: boolean;
}

export interface PageListResponse {
  items: PageResponse[];
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export interface CreatePageRequest {
  slug: string;
  title: string;
  pageType?: string;
}

export interface UpdatePageRequest {
  slug: string;
  title: string;
  content: Record<string, unknown> | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  ogImageId?: string | null;
  showInNav?: boolean;
  metaKeywords?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  noindex?: boolean;
  nofollow?: boolean;
}

export interface SchedulePublishRequest {
  scheduledPublishAt: string;
}

export interface PublicPageResponse {
  slug: string;
  title: string;
  content: Record<string, unknown> | null;
  metaTitle: string | null;
  metaDescription: string | null;
  metaKeywords: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImageUrl: string | null;
  noindex: boolean;
  nofollow: boolean;
}
