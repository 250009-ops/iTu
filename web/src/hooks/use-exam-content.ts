"use client";

import { useEffect, useState } from "react";
import type { ExamSkill, ListeningContent, ReadingContent, WritingContent } from "@/lib/exam/types";
import {
  listeningContent,
  readingContent,
  writingContent,
  speakingStudentContent,
} from "@/lib/mock/exam-content";
import { getExamContent } from "@/lib/api/exam";
import { getErrorMessage } from "@/lib/api/errors";

const FALLBACK: Record<ExamSkill, unknown> = {
  listening: listeningContent,
  reading: readingContent,
  writing: writingContent,
  speaking: speakingStudentContent,
};

function hasUsableContent(skill: ExamSkill, content: unknown): boolean {
  if (!content || typeof content !== "object") return false;
  const c = content as Record<string, unknown>;
  if (skill === "writing") return Array.isArray(c.tasks) && c.tasks.length > 0;
  if (skill === "speaking") return Array.isArray(c.parts) || !!c.intro;
  return Array.isArray(c.parts) && (c.parts as unknown[]).length > 0;
}

export function useExamContent<T = ListeningContent | ReadingContent | WritingContent>(
  sessionCode: string,
  skill: ExamSkill,
) {
  const [content, setContent] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<"api" | "fallback">("api");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const response = await getExamContent(sessionCode, skill);
        if (!active) return;
        if (hasUsableContent(skill, response.content)) {
          setContent(response.content as T);
          setSource("api");
        } else {
          setContent(FALLBACK[skill] as T);
          setSource("fallback");
        }
      } catch (err) {
        if (!active) return;
        setContent(FALLBACK[skill] as T);
        setSource("fallback");
        setError(getErrorMessage(err, "Using offline exam content"));
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [sessionCode, skill]);

  return { content, loading, error, source };
}
