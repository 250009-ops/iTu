"use client";

import { useCallback, useState } from "react";
import { AlertTriangle, CheckCircle2, PauseCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LiveSkill } from "@/lib/admin/types";
import { useInstitutionLiveMonitor } from "@/contexts/institution-live-monitor-context";
import { resumeInstitutionSession } from "@/lib/api/institution";
import { InstitutionSessionDetailDialog } from "@/components/institution/monitor/institution-session-detail-dialog";
import { LiveSessionTimeLeft } from "@/components/admin/monitor/live-session-time-left";
import { cn } from "@/lib/utils";

const skillBadge: Record<LiveSkill, string> = {
  speaking: "bg-rose-50 text-rose-700",
  writing: "bg-violet-50 text-violet-700",
  listening: "bg-sky-50 text-sky-700",
  reading: "bg-emerald-50 text-emerald-700",
};

export function InstitutionActiveExamsTable() {
  const { liveSessions, refresh } = useInstitutionLiveMonitor();
  const [detailCode, setDetailCode] = useState<string | null>(null);

  const openSession = useCallback((sessionCode: string) => {
    setDetailCode(sessionCode);
  }, []);

  return (
    <>
      <div className="rounded-xl border border-border bg-white shadow-sm">
        <div className="border-b border-border px-5 py-4 sm:px-6">
          <h2 className="font-semibold text-navy">Active Exams</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-slate-50 text-xs font-semibold uppercase tracking-wide text-muted">
                <th className="px-5 py-3 sm:px-6">Student</th>
                <th className="px-5 py-3 sm:px-6">Module</th>
                <th className="px-5 py-3 sm:px-6">Progress</th>
                <th className="px-5 py-3 sm:px-6">Time Left</th>
                <th className="px-5 py-3 sm:px-6">Examiner</th>
                <th className="px-5 py-3 sm:px-6">Integrity</th>
                <th className="px-5 py-3 text-right sm:px-6">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {liveSessions.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-8 text-center text-muted sm:px-6"
                  >
                    No active exams for your centre right now.
                  </td>
                </tr>
              ) : (
                liveSessions.map((session) => {
                  const isFlagged = session.integrity === "flagged";
                  const isSuspended = session.suspended;

                  return (
                    <tr key={session.id} className="hover:bg-slate-50/80">
                      <td className="px-5 py-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy text-sm font-bold text-white">
                            {session.initials}
                          </div>
                          <div>
                            <p className="font-semibold text-navy">
                              {session.studentName}
                            </p>
                            <p className="text-xs text-muted">{session.country}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 sm:px-6">
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                            skillBadge[session.skillType],
                          )}
                        >
                          {session.skill}
                        </span>
                      </td>
                      <td className="px-5 py-4 sm:px-6">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className={cn(
                                "h-full rounded-full",
                                isFlagged ? "bg-rose-500" : "bg-sky-500",
                              )}
                              style={{ width: `${session.progress}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium tabular-nums text-muted">
                            {session.progress}%
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 font-mono text-sm tabular-nums text-navy sm:px-6">
                        <LiveSessionTimeLeft
                          remainingSec={session.remainingSec}
                          syncedAt={session.syncedAt}
                          fallback={session.timeLeft}
                        />
                      </td>
                      <td className="px-5 py-4 text-muted sm:px-6">
                        {session.examiner}
                      </td>
                      <td className="px-5 py-4 sm:px-6">
                        {isSuspended ? (
                          <span className="flex items-center gap-1 text-sm font-medium text-amber-700">
                            <PauseCircle className="h-4 w-4" />
                            Suspended
                          </span>
                        ) : isFlagged ? (
                          <span className="flex items-center gap-1 text-sm font-medium text-brand-red">
                            <AlertTriangle className="h-4 w-4" />
                            {session.flags} flag{session.flags > 1 ? "s" : ""}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-sm font-medium text-emerald-600">
                            <CheckCircle2 className="h-4 w-4" />
                            Clear
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 sm:px-6">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => openSession(session.sessionCode)}
                          >
                            Details
                          </Button>
                          {isSuspended && (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => {
                                void resumeInstitutionSession(
                                  session.sessionCode,
                                ).then(() => refresh());
                              }}
                            >
                              Resume
                            </Button>
                          )}
                          {isFlagged && (
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => openSession(session.sessionCode)}
                            >
                              Review
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {detailCode && (
        <InstitutionSessionDetailDialog
          sessionCode={detailCode}
          open={Boolean(detailCode)}
          onClose={() => setDetailCode(null)}
          onUpdated={() => void refresh()}
        />
      )}
    </>
  );
}
