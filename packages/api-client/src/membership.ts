import { apiFetch } from "./client";

export interface MembershipPlan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  stripePriceIdCzk: string | null;
  stripePriceIdEur: string | null;
  features: Record<string, unknown>;
  sortOrder: number;
  active: boolean;
  createdAt: string;
}

export interface SubscriptionInfo {
  id: string;
  userId: string;
  planId: string;
  planName: string;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelledAt: string | null;
}

export interface MembershipData {
  subscription: SubscriptionInfo | Record<string, never>;
  plans: MembershipPlan[];
}

export const membershipAdminApi = {
  getPlans: () =>
    apiFetch<{ data: MembershipPlan[] }>("/api/admin/membership/plans"),

  createPlan: (data: {
    name: string;
    slug: string;
    description?: string;
    stripePriceIdCzk?: string;
    stripePriceIdEur?: string;
    features?: Record<string, unknown>;
    sortOrder?: number;
  }) =>
    apiFetch<{ data: MembershipPlan }>("/api/admin/membership/plans", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updatePlan: (
    id: string,
    data: {
      name?: string;
      description?: string;
      stripePriceIdCzk?: string;
      stripePriceIdEur?: string;
      features?: Record<string, unknown>;
      sortOrder?: number;
      active?: boolean;
    },
  ) =>
    apiFetch<{ data: MembershipPlan }>(
      `/api/admin/membership/plans/${id}`,
      {
        method: "PUT",
        body: JSON.stringify(data),
      },
    ),
};

export const membershipApi = {
  getSubscription: () =>
    apiFetch<{ data: MembershipData }>("/api/membership"),

  subscribe: (data: { planSlug: string; currency: string }) =>
    apiFetch<{ data: { url: string } }>("/api/membership/subscribe", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  cancelSubscription: () =>
    apiFetch<{ data: { success: boolean } }>("/api/membership/cancel", {
      method: "POST",
    }),
};
