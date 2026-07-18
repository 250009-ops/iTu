"use client";

import Link from "next/link";
import { ExaminerAvatar } from "@/components/student/teachers/examiner-card";
import type { PublicExaminer } from "@/lib/teachers/map-public-teacher";
import { STUDENT_VIEW_PATHS } from "@/lib/student/routes";

export function ExaminerListRow({
  examiner,
  profileHref,
}: {
  examiner: PublicExaminer;
  profileHref?: string;
}) {
  const href = profileHref ?? `${STUDENT_VIEW_PATHS.teachers}/${examiner.slug}`;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3">
      <ExaminerAvatar examiner={examiner} className="h-11 w-11 text-sm" />
      <p className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-900">
        {examiner.name}
      </p>
      <Link
        href={href}
        className="shrink-0 rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-navy transition-colors hover:bg-gray-50"
      >
        View profile
      </Link>
    </div>
  );
}
