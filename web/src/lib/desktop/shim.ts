"use client";

declare global {
  interface Window {
    __TAURI__?: {
      core?: {
        invoke: <T>(
          cmd: string,
          args?: Record<string, unknown>,
        ) => Promise<T>;
      };
    };
  }
}

export const DESKTOP_LAST_PATH_KEY = "itestu:desktop-last-path";
export const DESKTOP_WEB_ORIGIN_KEY = "itestu:desktop-web-origin";

export function isDesktopShell(): boolean {
  return typeof window !== "undefined" && Boolean(window.__TAURI__);
}

function isPersistablePath(path: string): boolean {
  if (!path.startsWith("/")) return false;
  if (path === "/" || path.startsWith("/login") || path.startsWith("/register")) {
    return false;
  }
  // Marketing pages are not useful resume targets for exam roles.
  if (
    path === "/download" ||
    path === "/how-it-works" ||
    path === "/for-students" ||
    path === "/for-teachers" ||
    path === "/centers" ||
    path === "/contact" ||
    path === "/terms" ||
    path === "/privacy" ||
    path === "/results"
  ) {
    return false;
  }
  return true;
}

async function invokeSaveDesktopResume(path: string, origin: string) {
  const invoke = window.__TAURI__?.core?.invoke;
  if (!invoke) return;
  try {
    await invoke("save_desktop_resume", { path, origin });
  } catch {
    // Capabilities / older builds may lack the command — localStorage still helps same-origin.
  }
}

/** Remember portal/exam routes so the shell can reopen where the user left off. */
export function persistDesktopLastPath(pathname?: string, search?: string) {
  if (typeof window === "undefined" || !isDesktopShell()) return;
  const path =
    (pathname ?? window.location.pathname) +
    (search ?? window.location.search ?? "");
  if (!isPersistablePath(path.split("?")[0] ?? path)) return;
  try {
    localStorage.setItem(DESKTOP_LAST_PATH_KEY, path);
    localStorage.setItem(DESKTOP_WEB_ORIGIN_KEY, window.location.origin);
  } catch {
    // ignore quota / private mode
  }
  void invokeSaveDesktopResume(path, window.location.origin);
}

export function getDesktopLastPath(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const path = localStorage.getItem(DESKTOP_LAST_PATH_KEY);
    return path && path.startsWith("/") ? path : null;
  } catch {
    return null;
  }
}

/** Prefer localStorage; fall back to Tauri app-data (shell ↔ remote origin bridge). */
export async function resolveDesktopLastPath(): Promise<string | null> {
  const local = getDesktopLastPath();
  if (local) return local;
  if (!isDesktopShell()) return null;
  const invoke = window.__TAURI__?.core?.invoke;
  if (!invoke) return null;
  try {
    const data = await invoke<{ path?: string | null }>("load_desktop_resume");
    const path = data?.path;
    if (path && path.startsWith("/")) {
      try {
        localStorage.setItem(DESKTOP_LAST_PATH_KEY, path);
      } catch {
        // ignore
      }
      return path;
    }
  } catch {
    // ignore
  }
  return null;
}

/** Hook network / battery signals from the desktop shell into exam presence. */
export function initDesktopExamBridge() {
  if (typeof window === "undefined" || !isDesktopShell()) return;

  window.addEventListener("offline", () => {
    window.dispatchEvent(
      new CustomEvent("itestu:exam-suspend", {
        detail: { reason: "network_loss" },
      }),
    );
  });

  if ("getBattery" in navigator) {
    void (
      navigator as Navigator & {
        getBattery?: () => Promise<{
          level: number;
          charging: boolean;
          addEventListener: (
            type: string,
            listener: () => void,
          ) => void;
        }>;
      }
    )
      .getBattery?.()
      .then((battery) => {
        const check = () => {
          if (!battery.charging && battery.level <= 0.08) {
            window.dispatchEvent(
              new CustomEvent("itestu:exam-suspend", {
                detail: { reason: "battery_critical" },
              }),
            );
          }
        };
        battery.addEventListener("levelchange", check);
        battery.addEventListener("chargingchange", check);
      })
      .catch(() => undefined);
  }
}

type ToastFn = (
  title: string,
  options?: {
    description?: string;
    variant?: "success" | "info" | "warning" | "error";
  },
) => void;

/**
 * Desktop-only connectivity toasts and last-path persistence.
 * Keeps the webview feeling native when the network drops mid-session.
 */
export function initDesktopConnectivityUx(toast: ToastFn) {
  if (typeof window === "undefined" || !isDesktopShell()) return () => undefined;

  let lastOfflineToast = 0;

  const persist = () => persistDesktopLastPath();
  persist();

  const onOffline = () => {
    const now = Date.now();
    if (now - lastOfflineToast < 2000) return;
    lastOfflineToast = now;
    const onExam = window.location.pathname.startsWith("/exam/");
    toast("Connection lost", {
      description: onExam
        ? "Your section will pause. Answers already saved stay on the server — reconnect and wait for an admin to resume if needed."
        : "Check your internet. Your account session is kept so you can continue where you left off.",
      variant: "warning",
    });
  };

  const onOnline = () => {
    toast("Back online", {
      description: "Reconnected to iTestU.",
      variant: "success",
    });
  };

  const onPopState = () => persist();

  // Capture SPA navigations that update history without full reload.
  const originalPush = history.pushState.bind(history);
  const originalReplace = history.replaceState.bind(history);
  history.pushState = function (...args) {
    originalPush(...args);
    persist();
  };
  history.replaceState = function (...args) {
    originalReplace(...args);
    persist();
  };

  window.addEventListener("offline", onOffline);
  window.addEventListener("online", onOnline);
  window.addEventListener("popstate", onPopState);
  window.addEventListener("beforeunload", persist);

  if (navigator.onLine === false) {
    onOffline();
  }

  return () => {
    window.removeEventListener("offline", onOffline);
    window.removeEventListener("online", onOnline);
    window.removeEventListener("popstate", onPopState);
    window.removeEventListener("beforeunload", persist);
    history.pushState = originalPush;
    history.replaceState = originalReplace;
  };
}
