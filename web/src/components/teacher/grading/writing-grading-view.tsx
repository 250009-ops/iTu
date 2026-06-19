"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Award, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ApiDataShell } from "@/components/shared/api-data-shell";
import { useToast } from "@/components/ui/toast";
import { getWritingSubmission, scoreWriting } from "@/lib/api/grading";
import { getErrorMessage } from "@/lib/api/errors";
import { bandOptions } from "@/lib/speaking/scoring";
import { cn } from "@/lib/utils";

type Submission = Awaited<ReturnType<typeof getWritingSubmission>>;

const WRITING_CRITERIA = [
  "Task Achievement",
  "Coherence & Cohesion",
  "Lexical Resource",
  "Grammatical Range & Accuracy",
] as const;

type CriterionKey = (typeof WRITING_CRITERIA)[number];

/** API keys expected by POST /grading/writing/:id/score (band-validation). */
const WRITING_CRITERIA_API_KEYS: Record<CriterionKey, string> = {
  "Task Achievement": "taskAchievement",
  "Coherence & Cohesion": "coherenceCohesion",
  "Lexical Resource": "lexicalResource",
  "Grammatical Range & Accuracy": "grammar",
};

function computeOverall(scores: Record<string, number>): number {
  const values = Object.values(scores);
  if (!values.length) return 0;
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  return Math.round(avg * 2) / 2;
}

function TaskPanel({
  title,
  wordCount,
  text,
}: {
  title: string;
  wordCount: number;
  text: string | null;
}) {
  return (
    <div className="rounded-xl border border-border bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <h3 className="font-semibold text-navy">{title}</h3>
        <span className="text-xs font-medium text-muted">
          {wordCount} words
        </span>
      </div>
      <div className="max-h-[22rem] overflow-y-auto whitespace-pre-wrap px-5 py-4 text-sm leading-relaxed text-foreground">
        {text?.trim() ? text : <span className="text-muted">No response submitted.</span>}
      </div>
    </div>
  );
}

function ScoreRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (score: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-navy">{label}</p>
        <span className="text-lg font-bold text-sky-600">{value}</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {bandOptions.map((score) => (
          <button
            key={score}
            type="button"
            onClick={() => onChange(score)}
            className={cn(
              "flex h-8 min-w-[2rem] items-center justify-center rounded-full px-1.5 text-xs font-semibold transition-colors",
              value === score
                ? "bg-navy text-white"
                : "bg-slate-100 text-muted hover:bg-slate-200",
            )}
          >
            {score}
          </button>
        ))}
      </div>
    </div>
  );
}

export function WritingGradingView({ submissionId }: { submissionId: string }) {
  const router = useRouter();
  const { toast } = useToast();

  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [scores, setScores] = useState<Record<CriterionKey, number>>({
    "Task Achievement": 7,
    "Coherence & Cohesion": 7,
    "Lexical Resource": 7,
    "Grammatical Range & Accuracy": 7,
  });
  const [feedback, setFeedback] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getWritingSubmission(submissionId);
      setSubmission(data);
      if (data.grade) {
        setScores((prev) => {
          const next = { ...prev };
          for (const label of WRITING_CRITERIA) {
            const score =
              data.grade?.criteriaScores?.[WRITING_CRITERIA_API_KEYS[label]] ??
              data.grade?.criteriaScores?.[label];
            if (typeof score === "number") next[label] = score;
          }
          return next;
        });
        setFeedback(data.grade.feedback ?? "");
      }
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load submission"));
    } finally {
      setLoading(false);
    }
  }, [submissionId]);

  useEffect(() => {
    void load();
  }, [load]);

  const overall = useMemo(() => computeOverall(scores), [scores]);

  async function handleSubmit() {
    setSubmitting(true);
    setConfirmOpen(false);
    try {
      const criteriaScores = Object.fromEntries(
        WRITING_CRITERIA.map((label) => [
          WRITING_CRITERIA_API_KEYS[label],
          scores[label],
        ]),
      );
      await scoreWriting(submissionId, {
        criteriaScores,
        overallBand: overall,
        feedback: feedback.trim() || undefined,
      });
      toast("Grade submitted", {
        description: `${submission?.studentName} · Writing band ${overall.toFixed(1)}`,
        variant: "success",
      });
      router.push("/teacher/grading");
    } catch (err) {
      toast("Could not submit grade", {
        description: getErrorMessage(err, "Please try again."),
        variant: "error",
      });
    } finally {
      setSubmitting(false);
    }
  }

  const alreadyGraded = submission?.status === "graded";

  return (
    <ApiDataShell
      loading={loading}
      error={error}
      empty={!submission}
      emptyMessage="Submission not found."
    >
      {submission && (
        <div className="p-4 lg:p-6 xl:p-8">
          <div className="mx-auto max-w-6xl space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <Link
                  href="/teacher/grading"
                  className="inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-navy"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to queue
                </Link>
                <h1 className="mt-2 text-2xl font-bold tracking-tight text-navy">
                  Grade Writing · {submission.studentName}
                </h1>
                <p className="mt-1 text-sm text-muted">
                  Score Task 1 &amp; Task 2 against the IELTS Writing rubric.
                </p>
              </div>
              {alreadyGraded && (
                <span className="inline-flex h-fit items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-emerald-700">
                  Already graded
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="space-y-6">
                <TaskPanel
                  title="Task 1"
                  wordCount={submission.task1WordCount}
                  text={submission.task1Text}
                />
                <TaskPanel
                  title="Task 2"
                  wordCount={submission.task2WordCount}
                  text={submission.task2Text}
                />
              </div>

              <div className="space-y-4">
                <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-amber-500" />
                    <h2 className="font-semibold text-navy">Band Scoring</h2>
                  </div>

                  <div className="mt-4 space-y-5">
                    {WRITING_CRITERIA.map((criterion) => (
                      <ScoreRow
                        key={criterion}
                        label={criterion}
                        value={scores[criterion]}
                        onChange={(v) =>
                          setScores((prev) => ({ ...prev, [criterion]: v }))
                        }
                      />
                    ))}
                  </div>

                  <div className="mt-5 rounded-lg bg-sky-50 px-4 py-3">
                    <p className="text-xs font-medium text-muted">Overall Band</p>
                    <p className="text-3xl font-bold text-sky-600">
                      {overall.toFixed(1)}
                    </p>
                  </div>

                  <textarea
                    placeholder="Add written feedback for the candidate…"
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    rows={5}
                    className="mt-4 w-full resize-none rounded-lg border border-border bg-slate-50 px-3 py-2.5 text-sm placeholder:text-slate-400 focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-100"
                  />

                  <Button
                    variant="danger"
                    size="default"
                    className="mt-4 w-full"
                    loading={submitting}
                    onClick={() => setConfirmOpen(true)}
                  >
                    <Save className="h-4 w-4" />
                    {alreadyGraded ? "Update Grade" : "Save & Submit Grade"}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <ConfirmDialog
            open={confirmOpen}
            title={alreadyGraded ? "Update writing grade" : "Submit writing grade"}
            message={`Record an overall band of ${overall.toFixed(1)} for ${submission.studentName}? Results release once all four skills are graded.`}
            confirmLabel={alreadyGraded ? "Update grade" : "Submit grade"}
            onConfirm={handleSubmit}
            onCancel={() => setConfirmOpen(false)}
          />
        </div>
      )}
    </ApiDataShell>
  );
}
