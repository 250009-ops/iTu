"use client";

import { useRouter } from "next/navigation";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GradingQueueEmpty } from "@/components/teacher/grading/grading-queue-empty";
import { useTeacherGrading } from "@/contexts/teacher-grading-context";
import type { GradingStatus } from "@/lib/api/mappers/teacher";
import { cn } from "@/lib/utils";

const statusStyles: Record<
  GradingStatus,
  { label: string; className: string }
> = {
  pending: { label: "Pending", className: "bg-amber-50 text-amber-700" },
  in_review: { label: "In Review", className: "bg-sky-50 text-sky-700" },
  graded: { label: "Graded", className: "bg-emerald-50 text-emerald-700" },
};

export function SubmissionsTable() {
  const router = useRouter();
  const { submissions } = useTeacherGrading();

  return (
    <div className="rounded-xl border border-border bg-white shadow-sm">
      <div className="border-b border-border px-5 py-4 sm:px-6">
        <h2 className="font-semibold text-navy">Pending Submissions</h2>
        <p className="mt-0.5 text-sm text-muted">
          Click Grade to review and score student writing
        </p>
      </div>

      {submissions.length === 0 ? (
        <GradingQueueEmpty />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-slate-50 text-xs font-semibold uppercase tracking-wide text-muted">
                <th className="px-5 py-3 sm:px-6">Student</th>
                <th className="px-5 py-3 sm:px-6">Date</th>
                <th className="px-5 py-3 sm:px-6">SLA</th>
                <th className="px-5 py-3 sm:px-6">Status</th>
                <th className="px-5 py-3 sm:px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {submissions.map((row) => {
                const status = statusStyles[row.status];
                const isGraded = row.status === "graded";

                return (
                  <tr key={row.id} className="hover:bg-slate-50/80">
                    <td className="px-5 py-4 sm:px-6">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700">
                          {row.initials}
                        </div>
                        <span className="font-semibold text-navy">
                          {row.studentName}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-muted sm:px-6">{row.date}</td>
                    <td className="px-5 py-4 sm:px-6">
                      <span
                        className={cn(
                          "flex items-center gap-1 font-semibold",
                          row.urgent ? "text-brand-red" : "text-muted",
                        )}
                      >
                        <Clock className="h-3.5 w-3.5" />
                        {row.slaHours} hrs
                      </span>
                    </td>
                    <td className="px-5 py-4 sm:px-6">
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                          status.className,
                        )}
                      >
                        {status.label}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right sm:px-6">
                      <Button
                        variant={isGraded ? "secondary" : "primary"}
                        size="sm"
                        onClick={() =>
                          router.push(`/teacher/grading/${row.id}`)
                        }
                      >
                        {isGraded ? "Review" : "Grade Now"}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
