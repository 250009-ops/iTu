"use client";

import { useEffect, useState } from "react";
import { formatLongClock } from "@/lib/exam/helpers";

export function LiveSessionTimeLeft({
  remainingSec,
  syncedAt,
  fallback,
}: {
  remainingSec?: number;
  syncedAt?: number;
  fallback: string;
}) {
  const [display, setDisplay] = useState(fallback);

  useEffect(() => {
    if (remainingSec == null || syncedAt == null) {
      setDisplay(fallback);
      return;
    }

    const tick = () => {
      const elapsed = Math.floor((Date.now() - syncedAt) / 1000);
      const left = Math.max(0, remainingSec - elapsed);
      setDisplay(formatLongClock(left));
    };

    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [remainingSec, syncedAt, fallback]);

  return <>{display}</>;
}
