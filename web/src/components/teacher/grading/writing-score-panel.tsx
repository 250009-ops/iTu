"use client";

import { Sparkles } from "lucide-react";
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
  writingBandOptions,
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
}) {
  const labels =
    task === "task1" ? TASK1_CRITERION_LABELS : TASK2_CRITERION_LABELS;
  const taskBand = averageTaskBand(scores);
  const taskLabel = task === "task1" ? "Task 1" : "Task 2";

  return (
    <div className="rounded-xl border border-border bg-white shadow-sm">
      <div className="flex items-start justify-between border-b border-border px-5 py-4">
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
        <p className="text-3xl font-bold tabular-nums text-violet-600">
          {formatBand(taskBand)}
        </p>
      </div>

      <div className="space-y-5 px-5 py-4">
        {CRITERION_ORDER.map((id) => {
          const tone = WRITING_CRITERION_META[id].tone;
          const toneClasses = CRITERION_TONE_CLASSES[tone];
          return (
            <div key={id} className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-navy">{labels[id]}</p>
                <span
                  className={cn("text-lg font-bold tabular-nums", toneClasses.score)}
                >
                  {formatBand(scores[id])}
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {writingBandOptions.map((score) => (
                  <button
                    key={score}
                    type="button"
                    onClick={() => onScoreChange(id, score)}
                    className={cn(
                      "flex h-8 min-w-[2rem] items-center justify-center rounded-full px-1.5 text-xs font-semibold transition-colors",
                      scores[id] === score
                        ? toneClasses.pill
                        : "bg-slate-100 text-muted hover:bg-slate-200",
                    )}
                  >
                    {score}
                  </button>
                ))}
              </div>
            </div>
          );
        })}

        <textarea
          placeholder={`${taskLabel} feedback notes…`}
          value={feedback}
          onChange={(e) => onFeedbackChange(e.target.value)}
          rows={4}
          className="w-full resize-none rounded-lg border border-border bg-slate-50 px-3 py-2.5 text-sm placeholder:text-slate-400 focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-100"
        />

        {aiVisible && aiSuggested && (
          <div className="rounded-lg border border-violet-100 bg-violet-50/60 p-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-violet-600" />
              <p className="text-sm font-semibold text-navy">AI Suggested</p>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">
                Review required
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {CRITERION_ORDER.map((id) => {
                const tone = WRITING_CRITERION_META[id].tone;
                return (
                  <span
                    key={id}
                    className={cn(
                      "rounded-md px-2 py-1 text-xs font-bold ring-1 ring-inset",
                      CRITERION_TONE_CLASSES[tone].pillSoft,
                    )}
                  >
                    {WRITING_CRITERION_META[id].short}{" "}
                    {formatBand(aiSuggested[id])}
                  </span>
                );
              })}
            </div>
            <div className="mt-3 flex gap-2">
              <Button type="button" size="sm" onClick={onApplyAi}>
                Apply suggestions
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
            <p className="mt-2 text-[11px] text-muted">
              Suggestions assist marking — final band is examiner decision.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
