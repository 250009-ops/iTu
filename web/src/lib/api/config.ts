/**
 * API base URL resolution:
 * - Browser: same-origin `/api/v1` (works on donish.live, itestu.uz, or any domain on the VPS)
 * - Next.js SSR: internal loopback URL on the server
 * - Local dev: localhost via .env.local
 */
function resolveApiBaseUrl(): string {
  const publicUrl = process.env.NEXT_PUBLIC_API_URL;

  if (typeof window !== "undefined") {
    if (publicUrl?.startsWith("/")) return publicUrl;
    if (publicUrl) return publicUrl;
    return "/api/v1";
  }

  return (
    process.env.INTERNAL_API_URL ??
    publicUrl ??
    "http://localhost:3001/api/v1"
  );
}

export const API_BASE_URL = resolveApiBaseUrl();
