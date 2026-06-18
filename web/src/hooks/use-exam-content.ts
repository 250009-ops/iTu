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

const IS_PRODUCTION = process.env.NODE_ENV === "production";
const ALLOW_EXAM_FALLBACK =
  process.env.NEXT_PUBLIC_ALLOW_EXAM_CONTENT_FALLBACK === "true";

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
  // Reading content is organized into `passages`; Listening into `parts`.
  if (skill === "reading")
    return Array.isArray(c.passages) && (c.passages as unknown[]).length > 0;
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
        } else if (IS_PRODUCTION && !ALLOW_EXAM_FALLBACK) {
          setContent(null);
          setError("Exam content is not available for this session.");
        } else {
          setContent(FALLBACK[skill] as T);
          setSource("fallback");
        }
      } catch (err) {
        if (!active) return;
        if (IS_PRODUCTION && !ALLOW_EXAM_FALLBACK) {
          setContent(null);
          setError(
            getErrorMessage(err, "Exam content could not be loaded. Contact support."),
          );
        } else {
          setContent(FALLBACK[skill] as T);
          setSource("fallback");
          setError(getErrorMessage(err, "Using offline exam content"));
        }
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
