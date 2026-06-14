"use client";

import Link from "next/link";
import { ArrowRight, Calendar, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";

export function GradingQueueEmpty() {
  return (
    <div className="px-5 py-8 sm:px-6">
      <div className="rounded-xl border border-dashed border-border bg-slate-50 px-6 py-10 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-violet-100 text-violet-600">
          <PenLine size={22} />
        </div>
        <p className="mt-4 font-semibold text-navy">Queue is clear</p>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted">
          Writing submissions appear here after students complete the Writing
          section on mock day. Each entry includes Task 1 and Task 2 with an
          SLA timer for turnaround.
        </p>
        <div className="mt-5 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/teacher/availability">
            <Button variant="secondary" size="sm">
              <Calendar className="h-4 w-4" />
              Manage Availability
            </Button>
          </Link>
          <Link href="/teacher/dashboard">
            <Button variant="danger" size="sm">
              Back to Dashboard
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto opacity-60">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-slate-50 text-xs font-semibold uppercase tracking-wide text-muted">
              <th className="px-2 py-3">Student</th>
              <th className="px-2 py-3">Date</th>
              <th className="px-2 py-3">SLA</th>
              <th className="px-2 py-3">Status</th>
              <th className="px-2 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td
                colSpan={5}
                className="py-4 text-center text-xs text-muted"
              >
                Preview — rows populate when students submit writing
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
