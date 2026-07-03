"use client";

import { Sparkles } from "lucide-react";
import { BandScoreStepper } from "@/components/teacher/grading/band-score-stepper";
import { Button } from "@/components/ui/button";
import {
  CRITERION_ORDER,
  CRITERION_TONE_CLASSES,
  TASK1_CRITERION_LABELS,
  TASK2_CRITERION_LABELS,
  type TaskScores,
  type WritingCriterionId,
  type WritingTaskKey,
  WRITING_CRITERION_META,
  averageTaskBand,
  formatBand,
} from "@/lib/writing/scoring";
import { cn } from "@/lib/utils";

export function WritingScorePanel({
  task,
  scores,
  feedback,
  aiSuggested,
  aiVisible,
  onScoreChange,
  onFeedbackChange,
  onApplyAi,
  onDismissAi,
  className,
}: {
  task: WritingTaskKey;
  scores: TaskScores;
  feedback: string;
  aiSuggested: TaskScores | null;
  aiVisible: boolean;
  onScoreChange: (criterion: WritingCriterionId, value: number) => void;
  onFeedbackChange: (value: string) => void;
  onApplyAi: () => void;
  onDismissAi: () => void;
  className?: string;
}) {
  const labels =
    task === "task1" ? TASK1_CRITERION_LABELS : TASK2_CRITERION_LABELS;
  const taskBand = averageTaskBand(scores);
  const aiTaskBand = aiSuggested ? averageTaskBand(aiSuggested) : null;
  const taskLabel = task === "task1" ? "Task 1" : "Task 2";

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col bg-white xl:border-l xl:border-border",
        className,
      )}
    >
      <div className="flex shrink-0 items-start justify-between border-b border-border px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-navy">
            Scoring · {taskLabel}
          </p>
          {task === "task2" && (
            <span className="mt-1 inline-flex rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-700">
              Double weighted
            </span>
          )}
        </div>
        <p
          className={cn(
            "text-2xl font-bold tabular-nums",
            task === "task1" ? "text-sky-600" : "text-violet-600",
          )}
        >
          {formatBand(taskBand)}
        </p>
      </div>

      <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-4 py-3">
        {CRITERION_ORDER.map((id) => {
          const tone = WRITING_CRITERION_META[id].tone;
          const toneClasses = CRITERION_TONE_CLASSES[tone];
          return (
            <div
              key={id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-slate-50/60 px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-navy">
                  {labels[id]}
                </p>
                <p
                  className={cn(
                    "text-[11px] font-bold tabular-nums",
                    toneClasses.score,
                  )}
                >
                  {WRITING_CRITERION_META[id].short} · {formatBand(scores[id])}
                </p>
              </div>
              <BandScoreStepper
                value={scores[id]}
                onChange={(value) => onScoreChange(id, value)}
              />
            </div>
          );
        })}

        <textarea
          placeholder={`${taskLabel} feedback notes…`}
          value={feedback}
          onChange={(e) => onFeedbackChange(e.target.value)}
          rows={3}
          className="w-full resize-none rounded-lg border border-border bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
        />

        {aiVisible && aiSuggested && (
          <div className="rounded-lg border border-violet-100 bg-violet-50/60 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <Sparkles className="h-4 w-4 text-violet-600" />
              <p className="text-sm font-semibold text-navy">AI Suggested</p>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">
                Review required
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {CRITERION_ORDER.map((id) => {
                const tone = WRITING_CRITERION_META[id].tone;
                return (
                  <span
                    key={id}
                    className={cn(
                      "rounded-md px-2 py-0.5 text-[11px] font-bold ring-1 ring-inset",
                      CRITERION_TONE_CLASSES[tone].pillSoft,
                    )}
                  >
                    {WRITING_CRITERION_META[id].short}{" "}
                    {formatBand(aiSuggested[id])}
                  </span>
                );
              })}
            </div>
            {aiTaskBand !== null && (
              <p className="mt-1.5 text-xs font-semibold text-violet-800">
                AI task band: {formatBand(aiTaskBand)}
              </p>
            )}
            <div className="mt-2 flex gap-2">
              <Button type="button" size="sm" onClick={onApplyAi}>
                Apply
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={onDismissAi}
              >
                Dismiss
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
