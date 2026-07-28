"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpDown, Clock, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WritingStatsCards } from "@/components/teacher/grading/writing-stats-cards";
import { useTeacherGrading } from "@/contexts/teacher-grading-context";
import { useExaminerPaths } from "@/hooks/use-examiner-paths";
import type {
  GradingStatus,
  MappedWritingSubmission,
} from "@/lib/api/mappers/teacher";
import { cn } from "@/lib/utils";

type WritingTab = "pending" | "in_review" | "completed";

const statusStyles: Record<
  GradingStatus,
  { label: string; className: string }
> = {
  pending: { label: "Pending", className: "bg-amber-50 text-amber-700" },
  in_review: { label: "In Review", className: "bg-sky-50 text-sky-700" },
  graded: { label: "Graded", className: "bg-emerald-50 text-emerald-700" },
};

function SlaChip({ sla }: { sla: MappedWritingSubmission["sla"] }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
        sla.tone === "overdue" && "bg-red-50 text-red-600",
        sla.tone === "warn" && "bg-amber-50 text-amber-700",
        sla.tone === "ok" && "bg-slate-100 text-muted",
      )}
    >
      <Clock className="h-3 w-3" />
      {sla.label}
    </span>
  );
}

function CriteriaPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "sky" | "violet" | "emerald" | "amber";
}) {
  const tones = {
    sky: "bg-sky-50 text-sky-700 ring-sky-100",
    violet: "bg-violet-50 text-violet-700 ring-violet-100",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    amber: "bg-amber-50 text-amber-700 ring-amber-100",
  };
  const formatted = value % 1 === 0 ? value.toFixed(0) : value.toFixed(1);
  return (
    <span
      className={cn(
        "inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-bold ring-1 ring-inset",
        tones[tone],
      )}
    >
      {label} {formatted}
    </span>
  );
}

function ActiveQueueTable({
  rows,
  emptyTitle,
  emptyDescription,
  gradePath,
}: {
  rows: MappedWritingSubmission[];
  emptyTitle: string;
  emptyDescription: string;
  gradePath: (id: string) => string;
}) {
  const router = useRouter();

  if (rows.length === 0) {
    return (
      <div className="px-5 py-10 text-center sm:px-6">
        <p className="font-medium text-navy">{emptyTitle}</p>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted">{emptyDescription}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[880px] text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-muted">
            <th className="px-5 py-3 sm:px-6">Student</th>
            <th className="px-5 py-3 sm:px-6">Submitted</th>
            <th className="px-5 py-3 sm:px-6">T1 words</th>
            <th className="px-5 py-3 sm:px-6">T2 words</th>
            <th className="px-5 py-3 sm:px-6">SLA</th>
            <th className="px-5 py-3 sm:px-6">Status</th>
            <th className="px-5 py-3 text-right sm:px-6">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row) => {
            const status = statusStyles[row.status];
            return (
              <tr key={row.id} className="hover:bg-slate-50/70">
                <td className="px-5 py-4 sm:px-6">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                        row.colors.bg,
                        row.colors.text,
                      )}
                    >
                      {row.initials}
                    </div>
                    <span className="font-semibold text-navy">
                      {row.studentName}
                    </span>
                  </div>
                </td>
                <td className="px-5 py-4 sm:px-6">
                  <p className="font-medium text-navy">{row.dateLabel}</p>
                  <p className="text-xs text-muted">{row.timeLabel}</p>
                </td>
                <td className="px-5 py-4 font-semibold text-emerald-600 sm:px-6">
                  {row.task1WordCount}
                </td>
                <td className="px-5 py-4 font-semibold text-emerald-600 sm:px-6">
                  {row.task2WordCount}
                </td>
                <td className="px-5 py-4 sm:px-6">
                  <SlaChip sla={row.sla} />
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
                    variant="danger"
                    size="sm"
                    onClick={() => router.push(gradePath(row.id))}
                  >
                    Grade now
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function CompletedTable({
  rows,
  gradePath,
}: {
  rows: MappedWritingSubmission[];
  gradePath: (id: string) => string;
}) {
  const router = useRouter();

  if (rows.length === 0) {
    return (
      <div className="px-5 py-10 text-center sm:px-6">
        <p className="font-medium text-navy">No completed submissions yet</p>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted">
          Graded writing stays here with band scores and criterion breakdowns for
          your reference.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[960px] text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-muted">
            <th className="px-5 py-3 sm:px-6">Student</th>
            <th className="px-5 py-3 sm:px-6">Submitted</th>
            <th className="px-5 py-3 sm:px-6">T1 words</th>
            <th className="px-5 py-3 sm:px-6">T2 words</th>
            <th className="px-5 py-3 sm:px-6">Overall band</th>
            <th className="px-5 py-3 sm:px-6">Criteria</th>
            <th className="px-5 py-3 text-right sm:px-6">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row) => (
            <tr key={row.id} className="hover:bg-slate-50/70">
              <td className="px-5 py-4 sm:px-6">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                      row.colors.bg,
                      row.colors.text,
                    )}
                  >
                    {row.initials}
                  </div>
                  <span className="font-semibold text-navy">
                    {row.studentName}
                  </span>
                </div>
              </td>
              <td className="px-5 py-4 sm:px-6">
                <p className="font-medium text-navy">{row.dateLabel}</p>
                <p className="text-xs text-muted">{row.timeLabel}</p>
              </td>
              <td className="px-5 py-4 font-semibold text-emerald-600 sm:px-6">
                {row.task1WordCount}
              </td>
              <td className="px-5 py-4 font-semibold text-emerald-600 sm:px-6">
                {row.task2WordCount}
              </td>
              <td className="px-5 py-4 sm:px-6">
                <span className="text-2xl font-bold text-emerald-600">
                  {row.overallBand != null
                    ? row.overallBand % 1 === 0
                      ? row.overallBand.toFixed(0)
                      : row.overallBand.toFixed(1)
                    : "—"}
                </span>
              </td>
              <td className="px-5 py-4 sm:px-6">
                {row.criteria ? (
                  <div className="flex flex-wrap gap-1.5">
                    <CriteriaPill label="TA" value={row.criteria.ta} tone="sky" />
                    <CriteriaPill label="CC" value={row.criteria.cc} tone="violet" />
                    <CriteriaPill label="LR" value={row.criteria.lr} tone="emerald" />
                    <CriteriaPill label="GRA" value={row.criteria.gra} tone="amber" />
                  </div>
                ) : (
                  <span className="text-muted">—</span>
                )}
              </td>
              <td className="px-5 py-4 text-right sm:px-6">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => router.push(gradePath(row.id))}
                >
                  Review
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function WritingGradingHub({
  variant = "marketplace",
}: {
  variant?: "marketplace" | "centre";
}) {
  const { hub } = useTeacherGrading();
  const { gradingDetail } = useExaminerPaths();
  const [tab, setTab] = useState<WritingTab>("pending");
  const [search, setSearch] = useState("");
  const [sortSlaAsc, setSortSlaAsc] = useState(true);

  const sourceRows = useMemo(() => {
    if (tab === "pending") return hub.pending;
    if (tab === "in_review") return hub.inReview;
    return hub.completed;
  }, [tab, hub]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = sourceRows;
    if (q) {
      rows = rows.filter((r) => r.studentName.toLowerCase().includes(q));
    }
    if (tab !== "completed") {
      rows = [...rows].sort((a, b) =>
        sortSlaAsc ? a.slaSortKey - b.slaSortKey : b.slaSortKey - a.slaSortKey,
      );
    }
    return rows;
  }, [sourceRows, search, sortSlaAsc, tab]);

  const tabs: { id: WritingTab; label: string; count: number }[] = [
    { id: "pending", label: "Pending", count: hub.counts.pending },
    { id: "in_review", label: "In Review", count: hub.counts.inReview },
    { id: "completed", label: "Completed", count: hub.counts.completed },
  ];

  const isCentre = variant === "centre";

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-navy sm:text-3xl">
          Writing Grading Queue
        </h1>
        <p className="mt-1 text-sm text-muted">
          {isCentre
            ? "Grade Task 1 and Task 2 for centre-enrolled students. Results release when every skill in the student's package is graded."
            : "Grade Task 1 and Task 2 independently. Results release when every skill in the student's package is graded."}
        </p>
      </header>

      <WritingStatsCards />

      <nav className="flex gap-6 border-b border-border">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn(
              "inline-flex items-center gap-2 border-b-2 pb-3 text-sm font-semibold transition-colors",
              tab === item.id
                ? "border-brand-red text-brand-red"
                : "border-transparent text-muted hover:text-navy",
            )}
          >
            {item.label}
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[11px] font-bold",
                tab === item.id
                  ? item.id === "pending"
                    ? "bg-amber-100 text-amber-700"
                    : item.id === "in_review"
                      ? "bg-sky-100 text-sky-700"
                      : "bg-emerald-100 text-emerald-700"
                  : "bg-slate-100 text-muted",
              )}
            >
              {item.count}
            </span>
          </button>
        ))}
      </nav>

      <div className="rounded-xl border border-border bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="relative max-w-xs flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search student…"
              className="h-9 pl-9 text-sm"
            />
          </div>
          {tab !== "completed" && (
            <button
              type="button"
              onClick={() => setSortSlaAsc((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-semibold text-navy hover:bg-slate-50"
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
              SLA {sortSlaAsc ? "Soonest" : "Latest"}
            </button>
          )}
        </div>

        {tab === "completed" ? (
          <CompletedTable rows={filteredRows} gradePath={gradingDetail} />
        ) : (
          <ActiveQueueTable
            rows={filteredRows}
            gradePath={gradingDetail}
            emptyTitle={
              tab === "pending" ? "No pending submissions" : "Nothing in review"
            }
            emptyDescription={
              tab === "pending"
                ? isCentre
                  ? "When your centre's students complete Writing, AI-ready submissions appear here for grading. If AI assist is enabled, items wait until analysis finishes."
                  : "Writing submissions appear here after students complete Writing on mock day. If AI assist is enabled, items wait until analysis finishes."
                : "Submissions you have opened for grading appear here until you submit a band score."
            }
          />
        )}
      </div>
    </div>
  );
}
