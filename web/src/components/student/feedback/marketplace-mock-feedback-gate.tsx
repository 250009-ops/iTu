"use client";

import { useEffect, useState } from "react";
import {
  getPendingMockFeedback,
  type PendingMockFeedback,
} from "@/lib/api/students";
import { MockFeedbackModal } from "@/components/student/feedback/mock-feedback-modal";

/**
 * After a marketplace mock reaches awaiting-results / completed, prompt once
 * until the student submits or dismisses. Safe on `/student` and post-speaking
 * completion (institution students get 403 → no-op).
 */
export function MarketplaceMockFeedbackGate() {
  const [pending, setPending] = useState<PendingMockFeedback | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const delays = [0, 800, 2000];

    async function poll() {
      for (const delay of delays) {
        if (delay > 0) {
          await new Promise((r) => window.setTimeout(r, delay));
        }
        if (cancelled) return;
        try {
          const next = await getPendingMockFeedback();
          if (cancelled) return;
          if (next) {
            setPending(next);
            setChecked(true);
            return;
          }
        } catch {
          // Institution students / unauth — stop quietly.
          if (!cancelled) {
            setPending(null);
            setChecked(true);
          }
          return;
        }
      }
      if (!cancelled) {
        setPending(null);
        setChecked(true);
      }
    }

    void poll();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!checked || !pending) return null;

  return (
    <MockFeedbackModal
      pending={pending}
      onDone={() => setPending(null)}
    />
  );
}
