"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { logIntegrity } from "@/lib/api/exam";
import {
  requestExamFullscreen,
  type IntegrityWarning,
} from "@/hooks/use-exam-integrity";
import type {
  SpeakingStudentIntegrityEvent,
  SpeakingSyncMessage,
} from "@/lib/speaking/sync";

const EVENT_MESSAGES: Record<string, string> = {
  tab_switch:
    "You left the speaking session window or switched to another app. This is logged and your examiner has been notified.",
  fullscreen_exit:
    "You exited full-screen mode during the speaking test. This is logged and your examiner has been notified.",
  page_leave:
    "You attempted to leave the speaking session. Stay on this page until your examiner ends the session.",
};

function buildWarning(
  event: string,
  offenseCount: number,
  flagged: boolean,
): IntegrityWarning {
  return {
    event,
    message:
      EVENT_MESSAGES[event] ??
      "An exam integrity incident was recorded. Stay in the speaking session.",
    offenseCount,
    flagged,
  };
}

/** Fullscreen lock, tab-switch logging, and live examiner alerts during speaking. */
export function useSpeakingIntegrity(
  sessionCode: string,
  publishSync: (message: SpeakingSyncMessage) => Promise<void>,
  active: boolean,
) {
  const [warning, setWarning] = useState<IntegrityWarning | null>(null);
  const pendingTabWarningRef = useRef<IntegrityWarning | null>(null);

  const notifyExaminer = useCallback(
    (event: SpeakingStudentIntegrityEvent) => {
      void publishSync({ type: "student-integrity", event });
    },
    [publishSync],
  );

  const reportEvent = useCallback(
    async (event: SpeakingStudentIntegrityEvent, showImmediately: boolean) => {
      notifyExaminer(event);
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
    [sessionCode, notifyExaminer],
  );

  useEffect(() => {
    if (!active) return;

    if (!document.fullscreenElement) {
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

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      void reportEvent("page_leave", false);
      e.preventDefault();
      e.returnValue = "";
    };

    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [active, reportEvent]);

  const dismissWarning = useCallback(() => setWarning(null), []);

  return { warning, dismissWarning };
}

export const EXAMINER_INTEGRITY_ALERTS: Record<
  SpeakingStudentIntegrityEvent,
  string
> = {
  tab_switch: "Student switched tabs or left the window",
  fullscreen_exit: "Student exited full-screen mode",
  page_leave: "Student attempted to leave the speaking session",
};
