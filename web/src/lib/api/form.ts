import { getAccessToken } from "@/lib/auth/session";
import { handleUnauthorized } from "@/lib/auth/unauthorized";
import { API_BASE_URL } from "./config";
import { ApiError } from "./errors";

export type FormRequestOptions = {
  method?: string;
  auth?: boolean;
  token?: string | null;
};

export async function apiFetchForm<T>(
  path: string,
  formData: FormData,
  options: FormRequestOptions = {},
): Promise<T> {
  const { method = "POST", auth = true } = options;
  const token = options.token ?? (auth ? getAccessToken() : null);

  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: formData,
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
        : Array.isArray((data as { message?: unknown })?.message)
          ? ((data as { message: string[] }).message[0] ?? `Request failed (${response.status})`)
          : `Request failed (${response.status})`;

    if (response.status === 401 && auth) {
      handleUnauthorized("session_expired");
    }

    throw new ApiError(message, response.status, data);
  }

  return data as T;
}
