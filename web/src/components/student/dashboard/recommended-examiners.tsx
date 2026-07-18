"use client";

import Link from "next/link";
import { ArrowRight, Loader2 } from "lucide-react";
import { ExaminerCard } from "@/components/student/teachers/examiner-card";
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
      <div className="flex min-h-[280px] items-center justify-center rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
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
          No examiners with open availability right now. Check back soon.
        </p>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-2 lg:grid lg:grid-cols-5 lg:overflow-visible lg:pb-0">
          {examiners.map((examiner) => (
            <div key={examiner.id} className="w-[260px] shrink-0 lg:w-auto">
              <ExaminerCard examiner={examiner} compact />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
