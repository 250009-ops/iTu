"use client";

import { useCallback, useEffect, useRef } from "react";
import type { AnswerMap } from "@/lib/exam/types";
import { saveAnswers } from "@/lib/api/exam";

export function useExamAutosave(
  sessionCode: string,
  answers: AnswerMap,
  intervalMs = 15000,
) {
  const lastSaved = useRef("");
  const answersRef = useRef(answers);
  const sessionRef = useRef(sessionCode);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  answersRef.current = answers;
  sessionRef.current = sessionCode;

  const flushNow = useCallback(async () => {
    if (timerRef.current != null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    const current = answersRef.current;
    const serialized = JSON.stringify(current);
    if (serialized === lastSaved.current) return;

    const payload: Record<string, string | string[] | null> = {};
    for (const [key, value] of Object.entries(current)) {
      payload[key] = value;
    }
    if (Object.keys(payload).length === 0) return;

    await saveAnswers(sessionRef.current, payload);
    lastSaved.current = serialized;
  }, []);

  useEffect(() => {
    const serialized = JSON.stringify(answers);
    if (serialized === lastSaved.current) return;

    if (timerRef.current != null) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      void flushNow();
    }, intervalMs);

    return () => {
      if (timerRef.current != null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [answers, intervalMs, flushNow]);

  return { flushNow };
}
