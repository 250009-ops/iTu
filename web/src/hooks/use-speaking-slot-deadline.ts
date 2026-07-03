"use client";

import { useEffect, useRef, useState } from "react";
import {
  speakingSlotRemainingSec,
  speakingSlotWarnAt,
  speakingSlotEndAt,
} from "@/lib/speaking/slot-deadline";

export function useSpeakingSlotDeadline(
  scheduledAt: string | null | undefined,
  enabled: boolean,
  onWarn?: () => void,
  onExpire?: () => void,
) {
  const [remainingSec, setRemainingSec] = useState<number | null>(null);
  const warnedRef = useRef(false);
  const expiredRef = useRef(false);
  const onWarnRef = useRef(onWarn);
  const onExpireRef = useRef(onExpire);
  onWarnRef.current = onWarn;
  onExpireRef.current = onExpire;

  useEffect(() => {
    warnedRef.current = false;
    expiredRef.current = false;
  }, [scheduledAt]);

  useEffect(() => {
    if (!enabled || !scheduledAt) {
      setRemainingSec(null);
      return;
    }

    const tick = () => {
      const now = Date.now();
      setRemainingSec(speakingSlotRemainingSec(scheduledAt, now));
      const warnAt = speakingSlotWarnAt(scheduledAt);
      const endAt = speakingSlotEndAt(scheduledAt);
      if (warnAt && now >= warnAt.getTime() && !warnedRef.current) {
        warnedRef.current = true;
        onWarnRef.current?.();
      }
      if (endAt && now >= endAt.getTime() && !expiredRef.current) {
        expiredRef.current = true;
        onExpireRef.current?.();
      }
    };

    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [enabled, scheduledAt]);

  return remainingSec;
}
