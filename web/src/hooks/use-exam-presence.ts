"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  sendExamHeartbeat,
  suspendExamSession,
} from "@/lib/api/exam";
import { flushExamSaveOutbox } from "@/lib/exam/save-outbox";

type Options = {
  enabled?: boolean;
  heartbeatMs?: number;
};

export function useExamPresence(
  sessionCode: string,
  { enabled = true, heartbeatMs = 20_000 }: Options = {},
) {
  const [suspended, setSuspended] = useState(false);
  const [suspendReason, setSuspendReason] = useState<string | null>(null);
  const suspendingRef = useRef(false);

  const triggerSuspend = useCallback(
    async (reason: string) => {
      if (suspendingRef.current) return;
      suspendingRef.current = true;
      try {
        await flushExamSaveOutbox(sessionCode);
        const result = await suspendExamSession(sessionCode, reason);
        setSuspended(result.suspended);
        setSuspendReason(result.reason);
      } catch {
        // server may have already suspended via missed heartbeat
      } finally {
        suspendingRef.current = false;
      }
    },
    [sessionCode],
  );

  useEffect(() => {
    if (!enabled) return;

    let active = true;

    async function heartbeat() {
      try {
        const result = await sendExamHeartbeat(sessionCode);
        if (!active) return;
        setSuspended(result.suspended);
        if (result.suspended) {
          setSuspendReason("network_loss");
        }
      } catch {
        if (navigator.onLine === false) {
          void triggerSuspend("network_loss");
        }
      }
    }

    void heartbeat();
    const intervalId = window.setInterval(() => void heartbeat(), heartbeatMs);

    function onOffline() {
      void triggerSuspend("network_loss");
    }

    function onPageHide() {
      void triggerSuspend("power_loss");
    }

    function onDesktopEvent(e: Event) {
      const detail = (e as CustomEvent<{ reason?: string }>).detail;
      void triggerSuspend(detail?.reason ?? "network_loss");
    }

    window.addEventListener("offline", onOffline);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("itestu:exam-suspend", onDesktopEvent);

    return () => {
      active = false;
      window.clearInterval(intervalId);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("itestu:exam-suspend", onDesktopEvent);
    };
  }, [sessionCode, enabled, heartbeatMs, triggerSuspend]);

  return { suspended, suspendReason, triggerSuspend };
}
