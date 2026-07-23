"use client";

import { AlertTriangle, Info } from "lucide-react";
import type { PartitionStatus } from "@/lib/admin/content/numbering";
import { cn } from "@/lib/utils";

type Props = {
  status: PartitionStatus;
  className?: string;
  /** Practice Creation units — omit Passage/Section prefix in the banner. */
  practiceMode?: boolean;
};

export function PartitionBanner({ status, className, practiceMode = false }: Props) {
  const { label, range, count, missingAnswers, issues } = status;
  const hasError = issues.some((i) => i.severity === "error");
  const hasWarning = issues.some((i) => i.severity === "warning");
  const answeredCount = count - missingAnswers;

  return (
    <div
      className={cn(
        "rounded-lg border px-4 py-3",
        hasError
          ? "border-red-200 bg-red-50/60"
          : hasWarning
            ? "border-amber-200 bg-amber-50/50"
            : count === range.expectedCount
              ? "border-emerald-200 bg-emerald-50/40"
              : "border-sky-200 bg-sky-50/40",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-navy">
          {practiceMode
            ? `Questions ${range.from}–${range.to}`
            : `${label} · Questions ${range.from}–${range.to}`}
        </p>
        <p className="text-xs text-muted">
          {count}/{range.expectedCount} in content
          {count > 0 && (
            <> · {answeredCount}/{count} answers filled</>
          )}
        </p>
      </div>

      {issues.length > 0 && (
        <ul className="mt-2 space-y-1">
          {issues.map((issue) => (
            <li
              key={issue.id}
              className={cn(
                "flex items-start gap-1.5 text-xs",
                issue.severity === "error" ? "text-red-700" : "text-amber-800",
              )}
            >
              {issue.severity === "error" ? (
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              ) : (
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              )}
              <span>
                {issue.message}
                {issue.hint && (
                  <span className="block text-muted">{issue.hint}</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
