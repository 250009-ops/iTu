"use client";

import { useEffect, useRef, useState } from "react";

/** Countdown from a fixed wall-clock start; survives unmount and part tab switches. */
export function usePart2Countdown(
  startedAt: number | null,
  totalSeconds: number,
  active: boolean,
  onExpire?: () => void,
) {
  const [remaining, setRemaining] = useState(totalSeconds);
  const firedRef = useRef(false);
  const expireRef = useRef(onExpire);
  expireRef.current = onExpire;

  useEffect(() => {
    firedRef.current = false;
  }, [startedAt, totalSeconds]);

  useEffect(() => {
    if (!active || !startedAt) {
      setRemaining(totalSeconds);
      return;
    }

    const tick = () => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      setRemaining(Math.max(0, totalSeconds - elapsed));
    };

    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [active, startedAt, totalSeconds]);

  useEffect(() => {
    if (!active || remaining > 0 || firedRef.current) return;
    firedRef.current = true;
    expireRef.current?.();
  }, [active, remaining]);

  return remaining;
}
