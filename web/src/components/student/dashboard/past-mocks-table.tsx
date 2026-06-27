"use client";

import Link from "next/link";
import { ArrowRight, FileText } from "lucide-react";
import { useStudentDashboardData } from "@/contexts/student-dashboard-context";
import { formatBandDisplay } from "@/lib/api/mappers/student";
import { cn } from "@/lib/utils";

const skillColumns = [
  { key: "listening" as const, label: "L" },
  { key: "reading" as const, label: "R" },
  { key: "writing" as const, label: "W" },
  { key: "speaking" as const, label: "S" },
];

function BandBadge({ score }: { score: number | null }) {
  if (score == null) {
    return <span className="text-xs text-muted">—</span>;
  }

  return (
    <span
      className={cn(
        "inline-flex min-w-[2.25rem] justify-center rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums",
        score >= 7
          ? "bg-emerald-50 text-emerald-700"
          : score >= 6
            ? "bg-sky-50 text-sky-700"
            : "bg-amber-50 text-amber-700",
      )}
    >
      {formatBandDisplay(score)}
    </span>
  );
}

export function PastMocksTable() {
  const { data } = useStudentDashboardData();
  const pastMocks = data?.pastMocks ?? [];

  const visibleColumns =
    pastMocks[0]?.packageSkills?.length
      ? skillColumns.filter((col) =>
          pastMocks[0]!.packageSkills!.includes(col.key),
        )
      : skillColumns;

  return (
    <div className="rounded-xl border border-border bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <h3 className="font-semibold text-navy">Past Mock Exams</h3>
        <Link
          href="/student/results"
          className="flex items-center gap-1 text-sm font-medium text-brand-red hover:text-brand-red-hover"
        >
          View all
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {pastMocks.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-muted">
          No completed mocks yet. Your history will appear here after your first exam.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="border-b border-border bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                <th className="px-5 py-3">Date</th>
                {visibleColumns.map((col) => (
                  <th key={col.key} className="px-3 py-3 text-center">
                    {col.label}
                  </th>
                ))}
                <th className="px-3 py-3 text-center">Overall</th>
                <th className="px-5 py-3 text-right">Report</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {pastMocks.map((mock) => {
                const dateLabel = new Date(mock.mockDate).toLocaleDateString(
                  "en-US",
                  { month: "short", day: "numeric", year: "numeric" },
                );
                const columns =
                  mock.packageSkills?.length
                    ? skillColumns.filter((col) =>
                        mock.packageSkills!.includes(col.key),
                      )
                    : visibleColumns;

                return (
                  <tr key={mock.id} className="transition-colors hover:bg-slate-50/50">
                    <td className="px-5 py-4">
                      <p className="font-medium text-foreground">{dateLabel}</p>
                      <p className="text-xs text-muted">{mock.package}</p>
                    </td>
                    {columns.map((col) => (
                      <td key={col.key} className="px-3 py-4 text-center">
                        <BandBadge score={mock[col.key]} />
                      </td>
                    ))}
                    <td className="px-3 py-4 text-center">
                      <span className="text-base font-bold text-navy">
                        {formatBandDisplay(mock.overall)}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        href="/student/results"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-navy hover:text-navy"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        Report
                      </Link>
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
