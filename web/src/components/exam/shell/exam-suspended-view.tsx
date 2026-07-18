"use client";

import { useEffect, useState } from "react";
import { Loader2, PauseCircle } from "lucide-react";
import { getExamSession } from "@/lib/api/exam";
import { useSseStream } from "@/hooks/use-sse-stream";

const REASON_LABELS: Record<string, string> = {
  network_loss: "connection or internet loss",
  power_loss: "power or device shutdown",
  battery_critical: "low battery",
  admin_hold: "administrator hold",
};

type Props = {
  sessionCode: string;
  reason?: string | null;
  onResumed?: () => void;
};

export function ExamSuspendedView({
  sessionCode,
  reason,
  onResumed,
}: Props) {
  const [checking, setChecking] = useState(false);

  useSseStream(`/exam-sessions/${sessionCode}/events/stream`, {
    enabled: true,
    onMessage: (payload) => {
      const msg = payload as { type?: string };
      if (msg.type === "exam:resumed") {
        onResumed?.();
      }
    },
  });

  useEffect(() => {
    const intervalId = window.setInterval(async () => {
      setChecking(true);
      try {
        const session = await getExamSession(sessionCode);
        if (!session.suspendedAt) {
          onResumed?.();
        }
      } catch {
        // keep waiting
      } finally {
        setChecking(false);
      }
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, [sessionCode, onResumed]);

  const label = reason ? REASON_LABELS[reason] ?? reason : "connection issue";

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-amber-700">
        <PauseCircle className="h-8 w-8" />
      </div>
      <h1 className="text-xl font-bold text-navy">Exam paused</h1>
      <p className="max-w-md text-sm text-muted">
        Your session was paused due to {label}. Your answers are saved. An
        administrator must resume your session before you can continue — you can
        wait here or sign in on another device.
      </p>
      <div className="flex items-center gap-2 text-sm text-muted">
        {checking ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Checking for resume…
          </>
        ) : (
          "Waiting for administrator approval…"
        )}
      </div>
    </div>
  );
}
