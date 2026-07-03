"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

export type IntegrityWarning = {
  event: string;
  message: string;
  offenseCount: number;
  flagged: boolean;
};

const EVENT_MESSAGES: Record<string, string> = {
  tab_switch:
    "You left the exam window or switched to another app. This is logged and may be reviewed.",
  fullscreen_exit:
    "You exited full-screen mode during the exam. This is logged and may be reviewed.",
  paste_attempt:
    "Copy and paste is disabled during the exam. This attempt was logged.",
};

/** Best-effort fullscreen request; safe to call from a user-gesture handler. */
export function requestExamFullscreen(): void {
  if (typeof document === "undefined") return;
  const el = document.documentElement;
  if (!document.fullscreenElement && el.requestFullscreen) {
    void el.requestFullscreen().catch(() => {});
  }
}

function buildWarning(
  event: string,
  offenseCount: number,
  flagged: boolean,
): IntegrityWarning {
  return {
    event,
    message:
      EVENT_MESSAGES[event] ??
      "An exam integrity incident was recorded. Stay in the exam window.",
    offenseCount,
    flagged,
  };
}

/** Fullscreen enforcement, tab-switch logging, paste blocking, and candidate warnings. */
export function useExamIntegrity(sessionCode: string, options: Options = {}) {
  const { fullscreen = true } = options;
  const [warning, setWarning] = useState<IntegrityWarning | null>(null);
  const pendingTabWarningRef = useRef<IntegrityWarning | null>(null);

  const reportEvent = useCallback(
    async (event: string, showImmediately: boolean) => {
      try {
        const res = await logIntegrity(sessionCode, event);
        const next = buildWarning(
          event,
          res.offenseCount ?? 0,
          res.integrity === "flagged",
        );
        if (showImmediately) {
          setWarning(next);
        } else {
          pendingTabWarningRef.current = next;
        }
      } catch {
        if (showImmediately) {
          setWarning(buildWarning(event, 0, false));
        }
      }
    },
    [sessionCode],
  );

  useEffect(() => {
    if (fullscreen && !document.fullscreenElement) {
      requestExamFullscreen();
    }

    const onFullscreenChange = () => {
      if (!document.fullscreenElement) {
        void reportEvent("fullscreen_exit", true);
      }
    };

    const onVisibility = () => {
      if (document.hidden) {
        void reportEvent("tab_switch", false);
        return;
      }
      if (pendingTabWarningRef.current) {
        setWarning(pendingTabWarningRef.current);
        pendingTabWarningRef.current = null;
      }
    };

    const onPaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target?.closest("[data-exam-surface]")) return;
      // Writing: allow cut/paste within the essay to reorder sentences.
      if (target.closest("[data-exam-writing-input]")) return;
      e.preventDefault();
      void reportEvent("paste_attempt", true);
    };

    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("paste", onPaste, true);

    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("paste", onPaste, true);
    };
  }, [sessionCode, fullscreen, reportEvent]);

  const dismissWarning = useCallback(() => setWarning(null), []);

  return { warning, dismissWarning };
}
