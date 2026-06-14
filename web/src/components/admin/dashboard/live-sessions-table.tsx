"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, AlertTriangle } from "lucide-react";
import { useAdminDashboard } from "@/contexts/admin-dashboard-context";
import type { LiveSkill } from "@/lib/admin/types";
import { cn } from "@/lib/utils";

const skillBadgeStyles: Record<LiveSkill, string> = {
  speaking: "bg-rose-50 text-rose-700",
  writing: "bg-violet-50 text-violet-700",
  listening: "bg-sky-50 text-sky-700",
  reading: "bg-emerald-50 text-emerald-700",
};

export function LiveSessionsTable() {
  const { liveSessions } = useAdminDashboard();

  return (
    <div className="rounded-xl border border-border bg-white shadow-sm">
      <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-navy">Live Sessions</h2>
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            {liveSessions.length} active
          </span>
        </div>
        <Link
          href="/admin/sessions"
          className="flex items-center gap-1 text-sm font-semibold text-sky-600 hover:text-sky-700"
        >
          Full monitor
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-slate-50 text-xs font-semibold uppercase tracking-wide text-muted">
              <th className="px-5 py-3 sm:px-6">Student</th>
              <th className="px-5 py-3 sm:px-6">Skill</th>
              <th className="px-5 py-3 sm:px-6">Progress</th>
              <th className="px-5 py-3 sm:px-6">Time Left</th>
              <th className="px-5 py-3 sm:px-6">Examiner</th>
              <th className="px-5 py-3 sm:px-6">Integrity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {liveSessions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-muted sm:px-6">
                  No active sessions.
                </td>
              </tr>
            ) : (
              liveSessions.map((session) => (
                <tr key={session.id} className="hover:bg-slate-50/80">
                  <td className="px-5 py-4 sm:px-6">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy text-xs font-bold text-white">
                        {session.initials}
                      </div>
                      <div>
                        <p className="font-semibold text-navy">{session.studentName}</p>
                        <p className="text-xs text-muted">{session.country}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 sm:px-6">
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                        skillBadgeStyles[session.skillType],
                      )}
                    >
                      {session.skill}
                    </span>
                  </td>
                  <td className="px-5 py-4 sm:px-6">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-sky-500"
                          style={{ width: `${session.progress}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium tabular-nums text-muted">
                        {session.progress}%
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4 font-mono text-sm tabular-nums text-navy sm:px-6">
                    {session.timeLeft}
                  </td>
                  <td className="px-5 py-4 text-muted sm:px-6">{session.examiner}</td>
                  <td className="px-5 py-4 sm:px-6">
                    {session.integrity === "clear" ? (
                      <span className="flex items-center gap-1 text-sm font-medium text-emerald-600">
                        <CheckCircle2 className="h-4 w-4" />
                        Clear
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-sm font-medium text-brand-red">
                        <AlertTriangle className="h-4 w-4" />
                        {session.flags} flag{session.flags > 1 ? "s" : ""}
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
