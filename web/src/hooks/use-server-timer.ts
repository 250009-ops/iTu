"use client";

import { useEffect, useState } from "react";
import { getTimer } from "@/lib/api/exam";

type Options = {
  /** When false, skip polling (e.g. before startSection completes). */
  enabled?: boolean;
  pollMs?: number;
};

export function useServerTimer(
  sessionCode: string,
  { enabled = true, pollMs = 30000 }: Options = {},
) {
  const [remaining, setRemaining] = useState<number | null>(null);
  const [expired, setExpired] = useState(false);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    let active = true;
    let intervalId: number | undefined;

    async function sync() {
      try {
        const timer = await getTimer(sessionCode);
        if (!active) return;

        if (timer.notStarted || timer.remainingSec == null) {
          setStarted(false);
          setRemaining(null);
          setExpired(false);
          return;
        }

        setStarted(true);
        setRemaining(timer.remainingSec);
        setExpired(Boolean(timer.expired));
      } catch {
        // keep last known value
      }
    }

    void sync();
    intervalId = window.setInterval(() => void sync(), pollMs);

    const tickId = window.setInterval(() => {
      setRemaining((prev) => {
        if (prev === null || prev <= 0) return prev;
        return prev - 1;
      });
    }, 1000);

    return () => {
      active = false;
      if (intervalId) window.clearInterval(intervalId);
      window.clearInterval(tickId);
    };
  }, [sessionCode, pollMs, enabled]);

  useEffect(() => {
    if (started && remaining === 0) {
      setExpired(true);
    }
  }, [started, remaining]);

  return {
    remaining,
    expired: started && expired,
    started,
  };
}
