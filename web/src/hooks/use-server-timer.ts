"use client";

import { useEffect, useState } from "react";
import { getTimer } from "@/lib/api/exam";

export function useServerTimer(sessionCode: string, pollMs = 30000) {
  const [remaining, setRemaining] = useState<number | null>(null);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    let active = true;
    let intervalId: number | undefined;

    async function sync() {
      try {
        const timer = await getTimer(sessionCode);
        if (!active) return;
        setRemaining(timer.remainingSec);
        setExpired(timer.expired ?? timer.remainingSec === 0);
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
  }, [sessionCode, pollMs]);

  return { remaining: remaining ?? 0, expired };
}
