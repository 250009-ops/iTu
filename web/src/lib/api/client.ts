import { isOfflineDemoToken } from "@/lib/auth/demo-auth";
import { getAccessToken } from "@/lib/auth/session";
import { handleUnauthorized } from "@/lib/auth/unauthorized";
import { API_BASE_URL } from "./config";
import { ApiError } from "./errors";

export type RequestOptions = {
  method?: string;
  body?: unknown;
  token?: string | null;
  auth?: boolean;
};

export async function apiFetch<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = "GET", body, auth = true } = options;
  const token = options.token ?? (auth ? getAccessToken() : null);

  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (auth && token && isOfflineDemoToken(token)) {
    throw new ApiError(
      "Your session is invalid. Sign in again while the API is running.",
      401,
    );
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(
      `Cannot reach API at ${API_BASE_URL}. Start the backend: cd api && npm run start:dev`,
      0,
    );
  }

  const text = await response.text();
  let data: unknown = null;
  try {
    data = text ? (JSON.parse(text) as unknown) : null;
  } catch {
    throw new ApiError(`Invalid API response (${response.status})`, response.status);
  }

  if (!response.ok) {
    const message =
      typeof data === "object" &&
      data !== null &&
      "message" in data &&
      typeof (data as { message: unknown }).message === "string"
        ? (data as { message: string }).message
        : `Request failed (${response.status})`;

    if (response.status === 401 && auth) {
      const lower = message.toLowerCase();
      let reason = "session_expired";
      if (lower.includes("centre account") || lower.includes("center account")) {
        reason = lower.includes("suspended")
          ? "institution_suspended"
          : "institution_inactive";
      }
      handleUnauthorized(reason);
    }

    throw new ApiError(message, response.status, data);
  }

  return data as T;
}
