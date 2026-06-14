"use client";

import { useTeacherGrading } from "@/contexts/teacher-grading-context";

export function GradingHeader() {
  const { gradingSummary } = useTeacherGrading();

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-navy sm:text-3xl">
        Writing Grading Queue
      </h1>
      <p className="mt-1 text-sm text-muted">
        Grade Task 1 and Task 2 independently. Results released after Speaking.
      </p>
      <div className="mt-3 flex flex-wrap gap-3 text-sm">
        <span className="rounded-full bg-amber-50 px-3 py-1 font-semibold text-amber-700">
          {gradingSummary.pendingGrading} pending grading
        </span>
        <span className="rounded-full bg-sky-50 px-3 py-1 font-semibold text-sky-700">
          {gradingSummary.inReview} in review
        </span>
      </div>
    </div>
  );
}
