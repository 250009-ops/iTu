"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Download, PenLine } from "lucide-react";
import { useInstExaminer } from "@/contexts/inst-examiner-context";
import { getWritingGradingHub, type WritingHubRow } from "@/lib/api/grading";
import { getErrorMessage } from "@/lib/api/errors";
import { PageHeader, EmptyState } from "@/components/institution/ui";
import { ScopedBanner } from "@/components/inst-examiner/scoped-banner";
import { cn } from "@/lib/utils";

type HubData = Awaited<ReturnType<typeof getWritingGradingHub>>;

function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function relativeTime(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${Math.max(mins, 1)}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function taskLabel(row: WritingHubRow): string {
  const both = row.task1WordCount > 0 && row.task2WordCount > 0;
  if (both) return "T1 + T2";
  if (row.task2WordCount > 0) return "T2 only";
  return "T1 only";
}

function isUrgent(row: WritingHubRow): boolean {
  return row.slaMinutesRemaining != null && row.slaMinutesRemaining < 120;
}

function exportCsv(rows: WritingHubRow[]) {
  const header = ["Student", "Tasks", "Words", "Submitted", "Priority"];
  const lines = rows.map((r) =>
    [
      r.studentName,
      taskLabel(r),
      r.task1WordCount + r.task2WordCount,
      new Date(r.submittedAt).toISOString(),
      isUrgent(r) ? "URGENT" : "NORMAL",
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(","),
  );
  const blob = new Blob([[header.join(","), ...lines].join("\n")], {
    type: "text/csv",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "writing-queue.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function SubmissionRow({ row }: { row: WritingHubRow }) {
  const words = row.task1WordCount + row.task2WordCount;
  return (
    <div className="flex items-center gap-4 rounded-xl border border-border bg-white px-5 py-4 shadow-sm">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-violet-100 text-sm font-bold text-violet-600">
        {initials(row.studentName)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-navy">
          {row.studentName}
        </p>
        <p className="text-xs text-muted">
          Academic {taskLabel(row)} · Submitted {relativeTime(row.submittedAt)} ·{" "}
          {words} words
        </p>
      </div>
      <span
        className={cn(
          "hidden items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset sm:inline-flex",
          isUrgent(row)
            ? "bg-rose-50 text-rose-600 ring-rose-200"
            : "bg-slate-100 text-slate-500 ring-slate-200",
        )}
      >
        {isUrgent(row) ? "Urgent" : "Normal"}
      </span>
      <Link
        href={`/teacher/grading/${row.id}`}
        className="inline-flex items-center gap-2 rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-navy/90"
      >
        <PenLine className="h-4 w-4" /> Grade
      </Link>
    </div>
  );
}

export function InstExaminerWritingView() {
  const { info } = useInstExaminer();
  const [data, setData] = useState<HubData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getWritingGradingHub()
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err) => {
        if (!cancelled)
          setError(getErrorMessage(err, "Could not load the writing queue."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const centerName = info?.center?.name ?? "your center";

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-navy border-t-transparent" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error ?? "Something went wrong."}
        </div>
      </div>
    );
  }

  const pending = data.pending;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 sm:p-6">
      <PageHeader
        breadcrumb="Examiner Portal › Writing Grading"
        title="Writing Grading"
        description={`Centre students only · ${pending.length} pending`}
        actions={
          <button
            type="button"
            onClick={() => exportCsv(pending)}
            disabled={pending.length === 0}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-4 py-2 text-sm font-semibold text-navy transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="h-4 w-4" /> Export
          </button>
        }
      />

      <ScopedBanner
        centerName={centerName}
        message={
          <>
            All submissions below are exclusively from{" "}
            <span className="font-semibold text-navy">{centerName}</span>{" "}
            students. No marketplace assignments appear here.
          </>
        }
      />

      {pending.length === 0 ? (
        <EmptyState message="No writing submissions are waiting for grading." />
      ) : (
        <div className="flex flex-col gap-3">
          {pending.map((row) => (
            <SubmissionRow key={row.id} row={row} />
          ))}
        </div>
      )}
    </div>
  );
}
