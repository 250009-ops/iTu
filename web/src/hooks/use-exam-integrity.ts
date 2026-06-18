"use client";

import { useEffect } from "react";
import { logIntegrity } from "@/lib/api/exam";

type Options = {
  /**
   * Request fullscreen when the section loads (default true). Browsers block
   * programmatic fullscreen without a user gesture, so this is best-effort —
   * the reliable entry point is `requestExamFullscreen()` called from the
   * check-in "Begin" click.
   */
  fullscreen?: boolean;
};

/** Best-effort fullscreen request; safe to call from a user-gesture handler. */
export function requestExamFullscreen(): void {
  if (typeof document === "undefined") return;
  const el = document.documentElement;
  if (!document.fullscreenElement && el.requestFullscreen) {
    void el.requestFullscreen().catch(() => {});
  }
}

/** Fullscreen enforcement, tab-switch logging, and paste blocking for L/R/W. */
export function useExamIntegrity(sessionCode: string, options: Options = {}) {
  const { fullscreen = true } = options;

  useEffect(() => {
    if (fullscreen && !document.fullscreenElement) {
      requestExamFullscreen();
    }

    const onFullscreenChange = () => {
      if (!document.fullscreenElement) {
        void logIntegrity(sessionCode, "fullscreen_exit");
      }
    };

    const onVisibility = () => {
      if (document.hidden) {
        void logIntegrity(sessionCode, "tab_switch");
      }
    };

    const onPaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target?.closest("[data-exam-surface]")) return;
      e.preventDefault();
      void logIntegrity(sessionCode, "paste_attempt");
    };

    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("paste", onPaste, true);

    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("paste", onPaste, true);
    };
  }, [sessionCode, fullscreen]);
}
