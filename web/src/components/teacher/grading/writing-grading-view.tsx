"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Clock } from "lucide-react";
import { AnnotatedEssay } from "@/components/teacher/grading/annotated-essay";
import { WritingScorePanel } from "@/components/teacher/grading/writing-score-panel";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ApiDataShell } from "@/components/shared/api-data-shell";
import { useToast } from "@/components/ui/toast";
import {
  getWritingSubmission,
  scoreWriting,
} from "@/lib/api/grading";
import { getErrorMessage } from "@/lib/api/errors";
import {
  averageTaskBand,
  computeWritingOverallBand,
  defaultTaskScores,
  formatSla,
  formatSubmittedAt,
  formatWordCount,
  fromAiSuggestedScores,
  fromCriteriaPayload,
  getWordCountStatus,
  isScoresUnset,
  taskHasResponse,
  toCriteriaPayload,
  writingGradeIsDirty,
  type TaskFeedback,
  type TaskScores,
  type WritingAnnotation,
  type WritingTaskKey,
} from "@/lib/writing/scoring";
import { cn } from "@/lib/utils";

type Submission = Awaited<ReturnType<typeof getWritingSubmission>>;

function parseAnnotations(raw: unknown): WritingAnnotation[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (item): item is WritingAnnotation =>
      typeof item === "object" &&
      item !== null &&
      typeof (item as WritingAnnotation).start === "number" &&
      typeof (item as WritingAnnotation).end === "number" &&
      typeof (item as WritingAnnotation).criterion === "string",
  );
}

function PromptCard({
  task,
  prompt,
  visualCaption,
}: {
  task: WritingTaskKey;
  prompt: string | null;
  visualCaption: string | null;
}) {
  const label = task === "task1" ? "Task 1 Prompt" : "Task 2 Prompt";
  return (
    <div
      className={cn(
        "rounded-xl border bg-white px-5 py-4 shadow-sm",
        task === "task1" ? "border-sky-200" : "border-violet-200",
      )}
    >
      <p className="text-xs font-bold uppercase tracking-wide text-muted">
        {label}
      </p>
      {visualCaption && (
        <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs font-medium text-muted">
          {visualCaption}
        </p>
      )}
      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
        {prompt?.trim() || "Prompt unavailable for this submission."}
      </p>
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
  const [activeTask, setActiveTask] = useState<WritingTaskKey>("task1");
  const [task1Scores, setTask1Scores] = useState<TaskScores>(defaultTaskScores());
  const [task2Scores, setTask2Scores] = useState<TaskScores>(defaultTaskScores());
  const [feedback, setFeedback] = useState<TaskFeedback>({ task1: "", task2: "" });
  const [aiDismissed, setAiDismissed] = useState<{ task1: boolean; task2: boolean }>({
    task1: false,
    task2: false,
  });
  const aiAutoAppliedRef = useRef<{ task1: boolean; task2: boolean }>({
    task1: false,
    task2: false,
  });

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await getWritingSubmission(submissionId);
      setSubmission(data);

      const parsed = fromCriteriaPayload(data.grade?.criteriaScores);
      if (parsed) {
        setTask1Scores(parsed.task1);
        setTask2Scores(parsed.task2);
        setFeedback(parsed.feedback);
      } else {
        setTask1Scores(defaultTaskScores());
        setTask2Scores(defaultTaskScores());
        setFeedback({ task1: "", task2: "" });
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

  const aiStatus = submission?.aiEvaluation?.status;

  const task1Annotations = useMemo(
    () => parseAnnotations(submission?.aiEvaluation?.task1Annotations),
    [submission?.aiEvaluation?.task1Annotations],
  );
  const task2Annotations = useMemo(
    () => parseAnnotations(submission?.aiEvaluation?.task2Annotations),
    [submission?.aiEvaluation?.task2Annotations],
  );

  const aiSuggestedTask1 = fromAiSuggestedScores(
    submission?.aiEvaluation?.task1SuggestedScores ?? null,
    "task1",
  );
  const aiSuggestedTask2 = fromAiSuggestedScores(
    submission?.aiEvaluation?.task2SuggestedScores ?? null,
    "task2",
  );
  const alreadyGraded = submission?.status === "graded";

  const savedGrade = useMemo(() => {
    const parsed = fromCriteriaPayload(submission?.grade?.criteriaScores);
    return (
      parsed ?? {
        task1: defaultTaskScores(),
        task2: defaultTaskScores(),
        feedback: { task1: "", task2: "" },
      }
    );
  }, [submission?.grade?.criteriaScores]);

  const gradeDirty = useMemo(
    () =>
      writingGradeIsDirty(task1Scores, task2Scores, feedback, savedGrade),
    [task1Scores, task2Scores, feedback, savedGrade],
  );
  const canSubmitGrade = !alreadyGraded || gradeDirty;

  useEffect(() => {
    if (!submission || alreadyGraded || aiStatus !== "ready") return;

    if (
      aiSuggestedTask1 &&
      isScoresUnset(task1Scores) &&
      !aiAutoAppliedRef.current.task1
    ) {
      setTask1Scores(aiSuggestedTask1);
      aiAutoAppliedRef.current.task1 = true;
    }
    if (
      aiSuggestedTask2 &&
      isScoresUnset(task2Scores) &&
      !aiAutoAppliedRef.current.task2
    ) {
      setTask2Scores(aiSuggestedTask2);
      aiAutoAppliedRef.current.task2 = true;
    }
  }, [
    submission,
    alreadyGraded,
    aiStatus,
    aiSuggestedTask1,
    aiSuggestedTask2,
    task1Scores,
    task2Scores,
  ]);

  const task1Band = averageTaskBand(task1Scores);
  const task2Band = averageTaskBand(task2Scores);
  const overall = computeWritingOverallBand(task1Band, task2Band);
  const sla = formatSla(submission?.slaMinutesRemaining ?? null);

  const activePrompt =
    activeTask === "task1" ? submission?.task1Prompt : submission?.task2Prompt;
  const activeVisual =
    activeTask === "task1"
      ? submission?.task1VisualCaption
      : submission?.task2VisualCaption;
  const activeText =
    activeTask === "task1" ? submission?.task1Text : submission?.task2Text;
  const activeWordCount =
    activeTask === "task1"
      ? submission?.task1WordCount ?? 0
      : submission?.task2WordCount ?? 0;
  const activeAnnotations =
    activeTask === "task1" ? task1Annotations : task2Annotations;
  const activeScores = activeTask === "task1" ? task1Scores : task2Scores;
  const activeFeedback =
    activeTask === "task1" ? feedback.task1 : feedback.task2;
  const activeAiSuggested =
    activeTask === "task1" ? aiSuggestedTask1 : aiSuggestedTask2;
  const activeHasResponse = taskHasResponse(activeText);
  const aiReady =
    aiStatus === "ready" &&
    activeHasResponse &&
    activeAiSuggested !== null;

  async function handleSubmit() {
    setSubmitting(true);
    setConfirmOpen(false);
    try {
      await scoreWriting(submissionId, {
        criteriaScores: toCriteriaPayload(task1Scores, task2Scores, feedback),
        overallBand: overall,
      });
      toast(alreadyGraded ? "Grade updated" : "Grade submitted", {
        description: `${submission?.studentName} · Writing band ${overall.toFixed(1)}`,
        variant: "success",
      });
      if (alreadyGraded) {
        await load();
      } else {
        router.push("/teacher/grading");
      }
    } catch (err) {
      toast("Could not submit grade", {
        description: getErrorMessage(err, "Please try again."),
        variant: "error",
      });
    } finally {
      setSubmitting(false);
    }
  }

  function setActiveScore(criterion: keyof TaskScores, value: number) {
    if (activeTask === "task1") {
      setTask1Scores((prev) => ({ ...prev, [criterion]: value }));
    } else {
      setTask2Scores((prev) => ({ ...prev, [criterion]: value }));
    }
  }

  function setActiveFeedback(value: string) {
    setFeedback((prev) =>
      activeTask === "task1"
        ? { ...prev, task1: value }
        : { ...prev, task2: value },
    );
  }

  function applyAiSuggestions() {
    if (activeTask === "task1" && aiSuggestedTask1) {
      setTask1Scores(aiSuggestedTask1);
    }
    if (activeTask === "task2" && aiSuggestedTask2) {
      setTask2Scores(aiSuggestedTask2);
    }
    setAiDismissed((prev) => ({ ...prev, [activeTask]: true }));
  }

  return (
    <ApiDataShell
      loading={loading}
      error={error}
      empty={!submission}
      emptyMessage="Submission not found."
    >
      {submission && (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="shrink-0 border-b border-border bg-slate-50 px-4 py-4 lg:px-6 xl:px-8">
            <div className="mx-auto flex max-w-7xl flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <Link
                  href="/teacher/grading"
                  className="inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-navy"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to queue
                </Link>
                <h1 className="mt-2 text-xl font-bold tracking-tight text-navy sm:text-2xl">
                  Grade Writing · {submission.studentName}
                </h1>
                <p className="mt-1 text-sm text-muted">
                  {formatSubmittedAt(submission.submittedAt)} · T1 ·{" "}
                  {formatWordCount(submission.task1WordCount)} · T2 ·{" "}
                  {formatWordCount(submission.task2WordCount)}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {alreadyGraded && (
                  <span className="inline-flex h-fit items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-emerald-700">
                    Already graded
                  </span>
                )}
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold",
                    sla.tone === "overdue" && "bg-red-50 text-red-600",
                    sla.tone === "warn" && "bg-amber-50 text-amber-700",
                    sla.tone === "ok" && "bg-slate-100 text-muted",
                  )}
                >
                  <Clock className="h-3 w-3" />
                  {sla.label}
                </span>
              </div>
            </div>

            <div className="mx-auto mt-4 flex max-w-7xl gap-1 border-b border-border">
              {(
                [
                  ["task1", "Task 1", submission.task1WordCount],
                  ["task2", "Task 2", submission.task2WordCount],
                ] as const
              ).map(([key, label, words]) => {
                const underMin = !getWordCountStatus(key, words ?? 0).meetsMinimum;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveTask(key)}
                    className={cn(
                      "-mb-px border-b-2 px-4 py-2.5 text-sm transition-colors",
                      activeTask === key
                        ? key === "task1"
                          ? "border-sky-500 font-semibold text-sky-700"
                          : "border-violet-500 font-semibold text-violet-700"
                        : "border-transparent font-medium text-muted hover:text-navy",
                    )}
                  >
                    <span>{label}</span>
                    <span
                      className={cn(
                        "ml-1.5 font-normal tabular-nums",
                        underMin ? "text-amber-700" : "text-muted",
                      )}
                    >
                      · {formatWordCount(words)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col xl:flex-row">
            <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/40 px-4 py-4 lg:px-6 xl:px-8">
              <div className="mx-auto max-w-4xl space-y-4">
                <PromptCard
                  task={activeTask}
                  prompt={activePrompt ?? null}
                  visualCaption={activeVisual ?? null}
                />

                <AnnotatedEssay
                  text={activeText ?? null}
                  annotations={activeAnnotations}
                  wordCount={activeWordCount}
                  task={activeTask}
                />
              </div>
            </div>

            <aside className="flex w-full shrink-0 flex-col xl:w-[min(100%,22rem)]">
              <WritingScorePanel
                task={activeTask}
                scores={activeScores}
                feedback={activeFeedback}
                aiSuggested={activeAiSuggested}
                aiVisible={aiReady && !aiDismissed[activeTask]}
                task1Band={task1Band}
                task2Band={task2Band}
                overallBand={overall}
                alreadyGraded={alreadyGraded}
                submitting={submitting}
                submitDisabled={!canSubmitGrade}
                onSubmit={() => setConfirmOpen(true)}
                onScoreChange={setActiveScore}
                onFeedbackChange={setActiveFeedback}
                onApplyAi={applyAiSuggestions}
                onDismissAi={() =>
                  setAiDismissed((prev) => ({ ...prev, [activeTask]: true }))
                }
                className="max-h-[38vh] xl:max-h-none xl:flex-1"
              />
            </aside>
          </div>

          <ConfirmDialog
            open={confirmOpen}
            title={alreadyGraded ? "Update writing grade" : "Submit writing grade"}
            message={`Record an overall band of ${overall.toFixed(1)} for ${submission.studentName}? Results release once all required skills are graded.`}
            confirmLabel={alreadyGraded ? "Update grade" : "Submit grade"}
            onConfirm={handleSubmit}
            onCancel={() => setConfirmOpen(false)}
          />
        </div>
      )}
    </ApiDataShell>
  );
}
