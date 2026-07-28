"use client";

import { useCallback, useState } from "react";
import type { AnswerMap, AnswerValue } from "@/lib/exam/types";

export type TextSize = "normal" | "large" | "xlarge";

/** @deprecated Prefer TEXT_SIZE_ATTR + CSS zoom — absolute px classes do not scale child text-[Npx]. */
export const TEXT_SIZE_CLASS: Record<TextSize, string> = {
  normal: "text-[15px]",
  large: "text-[16.5px]",
  xlarge: "text-[18px]",
};

/** Zoom scales all descendant absolute font sizes (exam questions use text-[Npx]). */
export const TEXT_SIZE_ZOOM: Record<TextSize, number> = {
  normal: 1,
  large: 1.2,
  xlarge: 1.4,
};

export function textSizeProps(size: TextSize): {
  "data-exam-text-size": TextSize;
  style: { zoom: number };
} {
  return {
    "data-exam-text-size": size,
    style: { zoom: TEXT_SIZE_ZOOM[size] },
  };
}

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
