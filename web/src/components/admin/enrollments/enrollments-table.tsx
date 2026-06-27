"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Select } from "@/components/ui/select";
import { EnrollmentDetailDialog } from "@/components/admin/enrollments/enrollment-detail-dialog";
import {
  allModules,
  lifecycleFilterOptions,
  moduleBadges,
} from "@/lib/admin/constants";
import type { LifecycleStatus, ModuleKey } from "@/lib/admin/types";
import { useAdminEnrollments } from "@/contexts/admin-enrollments-context";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 6;

const lifecycleStyles: Record<
  LifecycleStatus,
  { label: string; dot: string; pill: string }
> = {
  in_progress: {
    label: "In Progress",
    dot: "bg-sky-500",
    pill: "bg-sky-50 text-sky-700",
  },
  awaiting_results: {
    label: "Awaiting Results",
    dot: "bg-amber-500",
    pill: "bg-amber-50 text-amber-700",
  },
  complete: {
    label: "Complete",
    dot: "bg-emerald-500",
    pill: "bg-emerald-50 text-emerald-700",
  },
};

function ModuleProgress({
  completedModules,
}: {
  completedModules: ModuleKey[];
}) {
  const done = completedModules.length;

  return (
    <div>
      <div className="flex gap-1.5">
        {allModules.map((mod) => {
          const badge = moduleBadges[mod];
          const isDone = completedModules.includes(mod);
          return (
            <div key={mod} className="relative">
              <span
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold",
                  badge.className,
                  !isDone && "opacity-40",
                )}
              >
                {badge.label}
              </span>
              {isDone && (
                <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-1 text-xs text-muted">{done}/4 done</p>
    </div>
  );
}

function ExaminerCell({
  name,
  initials,
}: {
  name: string;
  initials: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700">
        {initials}
      </div>
      <span className="text-sm text-navy">{name}</span>
    </div>
  );
}

export function EnrollmentsTable() {
  const { enrollments } = useAdminEnrollments();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | LifecycleStatus>(
    "all",
  );
  const [page, setPage] = useState(1);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const filtered = useMemo(() => {
    return enrollments.filter((e) => {
      const matchesStatus =
        statusFilter === "all" || e.lifecycle === statusFilter;
      const matchesQuery =
        !query.trim() ||
        e.studentName.toLowerCase().includes(query.toLowerCase()) ||
        e.enrollmentId.toLowerCase().includes(query.toLowerCase());
      return matchesStatus && matchesQuery;
    });
  }, [enrollments, query, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);

  const paged = useMemo(
    () => filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [filtered, safePage],
  );

  return (
    <div className="rounded-xl border border-border bg-white shadow-sm">
      <div className="border-b border-border px-5 py-4 sm:px-6">
        <h2 className="font-semibold text-navy">All Enrollments</h2>
        <p className="mt-0.5 text-sm text-muted">
          Click a row to view scores, rescore Listening/Reading, or override bands.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <div className="relative min-w-0 flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              placeholder="Search student or ID…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-9 w-full rounded-lg border border-border bg-slate-50 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-navy focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy/10"
            />
          </div>
          <Select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as "all" | LifecycleStatus)
            }
            className="h-9 w-full sm:w-40"
          >
            {lifecycleFilterOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1000px] text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-slate-50 text-xs font-semibold uppercase tracking-wide text-muted">
              <th className="px-5 py-3 sm:px-6">Enrollment</th>
              <th className="px-5 py-3 sm:px-6">Student</th>
              <th className="px-5 py-3 sm:px-6">Exam Date</th>
              <th className="px-5 py-3 sm:px-6">Module Progress</th>
              <th className="px-5 py-3 sm:px-6">Speaking Examiner</th>
              <th className="px-5 py-3 sm:px-6">Writing Examiner</th>
              <th className="px-5 py-3 sm:px-6">Lifecycle</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-8 text-center text-muted sm:px-6">
                  No enrollments found.
                </td>
              </tr>
            ) : (
              paged.map((enrollment) => {
                const lifecycle = lifecycleStyles[enrollment.lifecycle];
                return (
                  <tr
                    key={enrollment.id}
                    onClick={() => setDetailId(enrollment.id)}
                    className="cursor-pointer transition-colors hover:bg-slate-50/80"
                  >
                    <td className="px-5 py-4 sm:px-6">
                      <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-xs font-semibold text-navy">
                        {enrollment.enrollmentId}
                      </span>
                    </td>
                    <td className="px-5 py-4 sm:px-6">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy text-xs font-bold text-white">
                          {enrollment.initials}
                        </div>
                        <div>
                          <p className="font-semibold text-navy">
                            {enrollment.studentName}
                          </p>
                          <p className="text-xs text-muted">
                            Target: Band {enrollment.targetBand.toFixed(1)} ·{" "}
                            {enrollment.country}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 sm:px-6">
                      <p className="font-medium text-navy">
                        {enrollment.examDate}
                      </p>
                      <p className="text-xs text-muted">{enrollment.examTime}</p>
                    </td>
                    <td className="px-5 py-4 sm:px-6">
                      <ModuleProgress
                        completedModules={enrollment.completedModules}
                      />
                    </td>
                    <td className="px-5 py-4 sm:px-6">
                      <ExaminerCell
                        name={enrollment.speakingExaminer}
                        initials={enrollment.speakingExaminerInitials}
                      />
                    </td>
                    <td className="px-5 py-4 sm:px-6">
                      <ExaminerCell
                        name={enrollment.writingExaminer}
                        initials={enrollment.writingExaminerInitials}
                      />
                    </td>
                    <td className="px-5 py-4 sm:px-6">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                          lifecycle.pill,
                        )}
                      >
                        <span
                          className={cn("h-1.5 w-1.5 rounded-full", lifecycle.dot)}
                        />
                        {lifecycle.label}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 border-t border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="text-sm text-muted">
          Showing {paged.length} of {filtered.length} enrollment
          {filtered.length !== 1 ? "s" : ""}
        </p>
        <div className="flex gap-1">
          {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPage(p)}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg text-sm font-semibold transition-colors",
                p === safePage
                  ? "bg-navy text-white"
                  : "border border-border text-muted hover:bg-slate-50",
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {detailId && (
        <EnrollmentDetailDialog
          key={`${detailId}-${refreshKey}`}
          enrollmentId={detailId}
          open
          onClose={() => setDetailId(null)}
          onUpdated={() => setRefreshKey((k) => k + 1)}
        />
      )}
    </div>
  );
}
