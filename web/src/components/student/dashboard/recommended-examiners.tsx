"use client";

import Link from "next/link";
import { ArrowRight, Loader2 } from "lucide-react";
import { ExaminerListRow } from "@/components/student/teachers/examiner-list-row";
import type { PublicExaminer } from "@/lib/teachers/map-public-teacher";
import { STUDENT_VIEW_PATHS } from "@/lib/student/routes";

export function RecommendedExaminers({
  examiners,
  loading,
}: {
  examiners: PublicExaminer[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="flex h-fit self-start items-center justify-center rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <section className="h-fit self-start rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-bold text-gray-900">Recommended examiners</h2>
        <Link
          href={STUDENT_VIEW_PATHS.teachers}
          className="inline-flex items-center gap-1 text-sm font-semibold text-navy hover:underline"
        >
          View all examiners
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {examiners.length === 0 ? (
        <p className="text-sm text-gray-500">
          No examiners have open slots right now. Check back later or{" "}
          <Link
            href={STUDENT_VIEW_PATHS.teachers}
            className="font-semibold text-navy underline underline-offset-2"
          >
            browse all examiners
          </Link>
          .
        </p>
      ) : (
        <div className="space-y-2">
          {examiners.map((examiner) => (
            <ExaminerListRow key={examiner.id} examiner={examiner} />
          ))}
        </div>
      )}
    </section>
  );
}
