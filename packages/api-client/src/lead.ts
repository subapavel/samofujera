import { apiFetch } from "./client";
import type { ApiResponse } from "./types";

export interface LeadCaptureResponse {
  success: boolean;
  message: string;
}

export interface UtmParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
}

export const leadApi = {
  captureLeadForProduct: (
    slug: string,
    email: string,
    utmParams?: UtmParams,
  ) => {
    const searchParams = new URLSearchParams();
    if (utmParams?.utm_source)
      searchParams.set("utm_source", utmParams.utm_source);
    if (utmParams?.utm_medium)
      searchParams.set("utm_medium", utmParams.utm_medium);
    if (utmParams?.utm_campaign)
      searchParams.set("utm_campaign", utmParams.utm_campaign);
    if (utmParams?.utm_content)
      searchParams.set("utm_content", utmParams.utm_content);
    const qs = searchParams.toString();
    return apiFetch<ApiResponse<LeadCaptureResponse>>(
      `/api/public/lead-magnet/product/${slug}${qs ? `?${qs}` : ""}`,
      {
        method: "POST",
        body: JSON.stringify({ email }),
      },
    );
  },
};
