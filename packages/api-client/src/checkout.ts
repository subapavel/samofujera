import { apiFetch } from "./client";
import type {
  ApiResponse,
  CheckoutRequest,
  CheckoutResponse,
} from "./types";

export const checkoutApi = {
  createCheckout: (data: CheckoutRequest) =>
    apiFetch<ApiResponse<CheckoutResponse>>("/api/checkout", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};
