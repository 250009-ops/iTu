import { PRACTICE_STUDENT_VISIBLE } from "@/lib/practice/feature-flags";

export type UserRole = "student" | "teacher" | "admin" | "institution";

export interface AuthSession {
  accessToken: string;
  role: UserRole;
  email: string;
  name: string;
  /** True when the student is linked to an Edu Center (inst-student portal). */
  institutionLinked?: boolean;
}

const SESSION_KEY = "ielts_mock_session";
const REMEMBER_KEY = "ielts_mock_remember";

/** Cached snapshot for useSyncExternalStore — must return stable references. */
let cachedRaw: string | null | undefined = undefined;
let cachedSession: AuthSession | null = null;

export const DASHBOARD_PATHS: Record<UserRole, string> = {
  student: "/student",
  teacher: "/teacher/dashboard",
  admin: "/admin/dashboard",
  institution: "/institution",
};

function readRawSession(): string | null {
  if (typeof window === "undefined") return null;
  // Prefer localStorage (Remember me). Fall back to sessionStorage (this browser session).
  return (
    localStorage.getItem(SESSION_KEY) ?? sessionStorage.getItem(SESSION_KEY)
  );
}

/** Cached snapshot getter for useSyncExternalStore (client). */
export function getSession(): AuthSession | null {
  return syncCacheFromStorage();
}

/** Server snapshot — always null during SSR. */
export function getServerSession(): null {
  return null;
}

export function getAccessToken(): string | null {
  return getSession()?.accessToken ?? null;
}

function syncCacheFromStorage(): AuthSession | null {
  if (typeof window === "undefined") return null;

  const raw = readRawSession();

  if (raw === cachedRaw) {
    return cachedSession;
  }

  cachedRaw = raw;

  if (!raw) {
    cachedSession = null;
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as AuthSession;
    if (!parsed.accessToken || !parsed.role) {
      cachedSession = null;
      return null;
    }
    cachedSession = parsed;
    return cachedSession;
  } catch {
    cachedSession = null;
    return null;
  }
}

/**
 * Persist the auth session.
 * - rememberMe=true  → localStorage only (survives browser restart)
 * - rememberMe=false → sessionStorage only (cleared when the browser session ends)
 */
export function setSession(
  session: AuthSession,
  options?: { rememberMe?: boolean },
): void {
  if (typeof window === "undefined") return;

  const rememberMe = options?.rememberMe ?? false;
  const raw = JSON.stringify(session);

  sessionStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(SESSION_KEY);

  if (rememberMe) {
    localStorage.setItem(SESSION_KEY, raw);
    localStorage.setItem(REMEMBER_KEY, "1");
  } else {
    sessionStorage.setItem(SESSION_KEY, raw);
    localStorage.removeItem(REMEMBER_KEY);
  }

  cachedRaw = raw;
  cachedSession = session;
  window.dispatchEvent(new Event("ielts-auth-change"));
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(REMEMBER_KEY);
  cachedRaw = null;
  cachedSession = null;
  window.dispatchEvent(new Event("ielts-auth-change"));
}

export function subscribeSession(callback: () => void): () => void {
  const handler = () => callback();
  window.addEventListener("ielts-auth-change", handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener("ielts-auth-change", handler);
    window.removeEventListener("storage", handler);
  };
}

export function getDashboardPath(role: UserRole): string {
  return DASHBOARD_PATHS[role];
}

export function normalizeRole(role: string): UserRole {
  const lower = role.toLowerCase() as UserRole;
  if (
    lower === "student" ||
    lower === "teacher" ||
    lower === "admin" ||
    lower === "institution"
  ) {
    return lower;
  }
  return "student";
}

/** Practice shop path for the current student session (marketplace vs centre). */
export function studentPracticeShopPath(session: AuthSession): string {
  if (!PRACTICE_STUDENT_VISIBLE) {
    return session.institutionLinked ? "/inst-student" : "/student";
  }
  if (session.institutionLinked) return "/inst-student/practice/shop";
  return "/student/practice/shop";
}
