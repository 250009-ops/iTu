"use client";

import { useCallback, useState } from "react";
import type { AnswerMap, AnswerValue } from "@/lib/exam/types";

export type TextSize = "normal" | "large" | "xlarge";

export const TEXT_SIZE_CLASS: Record<TextSize, string> = {
  normal: "text-[15px]",
  large: "text-[16.5px]",
  xlarge: "text-[18px]",
};

export function useExamState(initialPartId: string) {
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [current, setCurrent] = useState<number | null>(null);
  const [activePart, setActivePart] = useState(initialPartId);
  const [textSize, setTextSize] = useState<TextSize>("normal");
  const [hideTimer, setHideTimer] = useState(false);

  const setAnswer = useCallback((n: number, value: AnswerValue) => {
    setAnswers((prev) => ({ ...prev, [n]: value }));
  }, []);

  const hydrateAnswers = useCallback((map: AnswerMap) => {
    setAnswers(map);
  }, []);

  const focusQuestion = useCallback((n: number) => setCurrent(n), []);

  return {
    answers,
    setAnswer,
    hydrateAnswers,
    current,
    setCurrent,
    focusQuestion,
    activePart,
    setActivePart,
    textSize,
    setTextSize,
    hideTimer,
    setHideTimer,
  };
}
