"use client";

import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { computeWritingOverallBand, formatBand } from "@/lib/writing/scoring";

export function WritingGradingFooter({
  task1Band,
  task2Band,
  submitting,
  alreadyGraded,
  onSubmit,
}: {
  task1Band: number;
  task2Band: number;
  submitting: boolean;
  alreadyGraded: boolean;
  onSubmit: () => void;
}) {
  const overall = computeWritingOverallBand(task1Band, task2Band);

  return (
    <div className="border-t border-border bg-white px-4 py-4 shadow-[0_-4px_24px_rgba(15,23,42,0.06)] sm:px-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
              Overall Writing Band
            </p>
            <p className="text-4xl font-bold tabular-nums text-navy">
              {formatBand(overall)}
            </p>
          </div>
          <p className="pb-1 text-sm text-muted">
            = T1 {formatBand(task1Band)} × 0.34 + T2 {formatBand(task2Band)} ×
            0.66
          </p>
          <div className="flex gap-3 pb-1 text-sm font-semibold">
            <span className="text-sky-600">Task 1: {formatBand(task1Band)}</span>
            <span className="text-violet-600">
              Task 2: {formatBand(task2Band)}
            </span>
          </div>
        </div>

        <Button
          variant="danger"
          size="lg"
          loading={submitting}
          onClick={onSubmit}
          className="w-full sm:w-auto"
        >
          <Save className="h-4 w-4" />
          {alreadyGraded ? "Update Grade" : "Save & Submit Grade"}
        </Button>
      </div>
    </div>
  );
}
