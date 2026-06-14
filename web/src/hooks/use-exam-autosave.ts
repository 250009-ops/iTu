"use client";

import { useEffect, useRef } from "react";
import type { AnswerMap } from "@/lib/exam/types";
import { saveAnswers } from "@/lib/api/exam";

export function useExamAutosave(
  sessionCode: string,
  answers: AnswerMap,
  intervalMs = 15000,
) {
  const lastSaved = useRef<string>("");

  useEffect(() => {
    const serialized = JSON.stringify(answers);
    if (serialized === lastSaved.current) return;

    const id = window.setTimeout(() => {
      const payload: Record<string, string | string[] | null> = {};
      for (const [key, value] of Object.entries(answers)) {
        payload[key] = value;
      }
      if (Object.keys(payload).length === 0) return;

      void saveAnswers(sessionCode, payload).then(() => {
        lastSaved.current = serialized;
      });
    }, intervalMs);

    return () => window.clearTimeout(id);
  }, [answers, sessionCode, intervalMs]);
}
