"use client";

declare global {
  interface Window {
    __TAURI__?: unknown;
  }
}

export function isDesktopShell(): boolean {
  return typeof window !== "undefined" && Boolean(window.__TAURI__);
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
