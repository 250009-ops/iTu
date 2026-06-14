import { clearSession } from "./session";

let handling = false;

/** Clear stale credentials and send the user back to login once per burst. */
export function handleUnauthorized(reason?: string): void {
  if (typeof window === "undefined" || handling) return;

  handling = true;
  clearSession();

  const params = new URLSearchParams();
  if (reason) params.set("reason", reason);

  const query = params.toString();
  const target = query ? `/login?${query}` : "/login";

  window.location.assign(target);

  window.setTimeout(() => {
    handling = false;
  }, 2000);
}
