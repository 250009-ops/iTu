"use client";

import { useEffect } from "react";
import { logIntegrity } from "@/lib/api/exam";

type Options = {
  /** Request fullscreen when the section loads (default true). */
  fullscreen?: boolean;
};

/** Fullscreen enforcement, tab-switch logging, and paste blocking for L/R/W. */
export function useExamIntegrity(sessionCode: string, options: Options = {}) {
  const { fullscreen = true } = options;

  useEffect(() => {
    if (fullscreen && document.documentElement.requestFullscreen) {
      void document.documentElement.requestFullscreen().catch(() => {});
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
