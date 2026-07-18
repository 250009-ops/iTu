"use client";

import { useEffect, useRef, useState } from "react";
import type { AnswerMap, ExamSkill } from "@/lib/exam/types";
import { getExamProgress, type ExamProgressResponse } from "@/lib/api/exam";

type HydrationResult = {
  loading: boolean;
  error: string | null;
  progress: ExamProgressResponse | null;
  hydratedAnswers: AnswerMap;
  hydratedWriting: { task1Text: string; task2Text: string } | null;
};

export function useExamProgressHydration(
  sessionCode: string,
  skill: ExamSkill,
  enabled: boolean,
) {
  const [state, setState] = useState<HydrationResult>({
    loading: enabled,
    error: null,
    progress: null,
    hydratedAnswers: {},
    hydratedWriting: null,
  });
  const loadedRef = useRef(false);

  useEffect(() => {
    if (!enabled || loadedRef.current) return;
    let active = true;

    void getExamProgress(sessionCode)
      .then((progress) => {
        if (!active) return;
        loadedRef.current = true;

        const answers: AnswerMap = {};
        for (const [key, value] of Object.entries(progress.answers ?? {})) {
          answers[Number(key)] = value;
        }

        setState({
          loading: false,
          error: null,
          progress,
          hydratedAnswers: answers,
          hydratedWriting: progress.writing,
        });
      })
      .catch((err) => {
        if (!active) return;
        setState((prev) => ({
          ...prev,
          loading: false,
          error: err instanceof Error ? err.message : "Failed to load progress",
        }));
      });

    return () => {
      active = false;
    };
  }, [sessionCode, skill, enabled]);

  return state;
}
