"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getPracticeAttempt,
  savePracticeAnswers,
  submitPracticeAttempt,
} from "@/lib/api/practice";
import { ApiDataShell } from "@/components/shared/api-data-shell";
import { Button } from "@/components/ui/button";
import { PracticeSkillPlayer } from "@/components/practice/practice-skill-player";
import type { ListeningContent, ReadingContent } from "@/lib/exam/types";

type Props = {
  attemptId: string;
  basePath: string;
};

export function PracticeAttemptView({ attemptId, basePath }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [skill, setSkill] = useState<"reading" | "listening" | null>(null);
  const [content, setContent] = useState<ReadingContent | ListeningContent | null>(
    null,
  );
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{
    rawScore: number;
    band: number | null;
    totalQuestions: number;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void getPracticeAttempt(attemptId)
      .then((data) => {
        const s = data.unit.skill as "reading" | "listening";
        setSkill(s);
        setContent(data.unit.content as ReadingContent | ListeningContent);
        setAnswers((data.attempt.answers as Record<string, string>) ?? {});
        if (data.attempt.status === "completed" && data.attempt.score) {
          setResult(data.attempt.score as typeof result);
        }
      })
      .catch(() => setError("Failed to load practice attempt"))
      .finally(() => setLoading(false));
  }, [attemptId]);

  const handleAnswerChange = useCallback(
    (questionNumber: number, value: string) => {
      setAnswers((prev) => {
        const next = { ...prev, [String(questionNumber)]: value };
        void savePracticeAnswers(attemptId, next);
        return next;
      });
    },
    [attemptId],
  );

  async function handleSubmit() {
    setSubmitting(true);
    try {
      await savePracticeAnswers(attemptId, answers);
      const res = await submitPracticeAttempt(attemptId);
      setResult(res.score);
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <div className="mx-auto max-w-lg space-y-4 p-8 text-center">
        <h1 className="text-2xl font-bold text-navy">Practice complete</h1>
        <p className="text-lg">
          Score: {result.rawScore} / {result.totalQuestions}
          {result.band != null && ` · Band ${result.band}`}
        </p>
        <a
          href={basePath}
          className="inline-flex items-center justify-center rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white"
        >
          Back to Practice Hub
        </a>
      </div>
    );
  }

  return (
    <ApiDataShell loading={loading} error={error}>
      {skill && content && (
        <>
          <PracticeSkillPlayer
            skill={skill}
            content={content}
            answers={answers}
            onAnswerChange={handleAnswerChange}
          />
          <div className="fixed bottom-4 right-4 z-50">
            <Button
              variant="primary"
              disabled={submitting}
              onClick={() => void handleSubmit()}
            >
              Submit practice
            </Button>
          </div>
        </>
      )}
    </ApiDataShell>
  );
}
