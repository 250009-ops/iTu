"use client";

import Link from "next/link";
import { ArrowRight, Clock, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTeacherDashboard } from "@/contexts/teacher-dashboard-context";
import { cn } from "@/lib/utils";

export function WritingQueueCard() {
  const { writingQueue } = useTeacherDashboard();
  const pendingCount = writingQueue.filter(
    (item) => item.status !== "graded",
  ).length;

  return (
    <div className="rounded-xl border border-border bg-white p-5 shadow-sm sm:p-6">
      <div>
        <h2 className="font-semibold text-navy">Writing Queue</h2>
        <p className="mt-0.5 text-sm text-muted">
          {pendingCount} submission{pendingCount === 1 ? "" : "s"} pending
        </p>
      </div>

      {writingQueue.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-border bg-slate-50 px-5 py-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-violet-100 text-violet-600">
            <PenLine size={22} />
          </div>
          <p className="mt-4 font-semibold text-navy">Queue is clear</p>
          <p className="mx-auto mt-1 max-w-xs text-sm text-muted">
            Student writing submissions land here after they complete the Writing
            section on mock day. SLA timers start when a submission arrives.
          </p>
          <Link href="/teacher/grading" className="mt-4 inline-block">
            <Button variant="secondary" size="sm">
              Open Grading
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      ) : (
        <ul className="mt-5 space-y-3">
          {writingQueue.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border px-4 py-3"
            >
              <div>
                <p className="font-semibold text-navy">{item.studentName}</p>
                <p className="text-xs text-muted">{item.submittedAt}</p>
              </div>

              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                    item.status === "pending"
                      ? "bg-amber-50 text-amber-700"
                      : "bg-sky-50 text-sky-700",
                  )}
                >
                  {item.status === "pending" ? "Pending" : "In Review"}
                </span>
                <span
                  className={cn(
                    "flex items-center gap-1 text-xs font-semibold",
                    item.urgent ? "text-brand-red" : "text-muted",
                  )}
                >
                  <Clock className="h-3.5 w-3.5" />
                  SLA: {item.slaHours} hrs
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      {pendingCount > 0 && (
        <Link
          href="/teacher/grading"
          className="mt-4 flex items-center gap-1 text-sm font-semibold text-sky-600 hover:text-sky-700"
        >
          View all {pendingCount} pending
          <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}
