/* eslint-disable @typescript-eslint/no-unsafe-member-access */
function getBaseUrl(): string {
  if (typeof process !== "undefined" && process.env?.["NEXT_PUBLIC_API_URL"]) {
    return process.env["NEXT_PUBLIC_API_URL"] as string;
  }
  return "http://localhost:8080";
}
/* eslint-enable @typescript-eslint/no-unsafe-member-access */

export const BASE_URL = getBaseUrl();

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: unknown,
  ) {
    super(`API error ${status}`);
  }
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const isFormData = init?.body instanceof FormData;
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: isFormData
      ? { ...init?.headers } // Let browser set Content-Type for FormData
      : { "Content-Type": "application/json", ...init?.headers },
  });

  if (!res.ok) {
    throw new ApiError(res.status, await res.json().catch(() => null));
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
