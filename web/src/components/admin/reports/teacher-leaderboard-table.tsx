"use client";

import { ArrowRight, Star, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { specialityPillStyles } from "@/lib/admin/constants";
import { useAdminReports } from "@/contexts/admin-reports-context";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

export function TeacherLeaderboardTable() {
  const { teacherLeaderboard } = useAdminReports();
  const { toast } = useToast();

  return (
    <div className="rounded-xl border border-border bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <h2 className="font-semibold text-navy">
            Teacher Performance Leaderboard
          </h2>
          <p className="mt-0.5 text-sm text-muted">
            Sessions delivered, ratings, and earnings
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            toast("Full performance report", {
              description: "The full teacher analytics report is coming soon.",
              variant: "info",
            })
          }
          className="flex items-center gap-1 text-sm font-semibold text-navy hover:underline"
        >
          Full Report
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-slate-50 text-xs font-semibold uppercase tracking-wide text-muted">
              <th className="px-5 py-3 sm:px-6">#</th>
              <th className="px-5 py-3 sm:px-6">Teacher</th>
              <th className="px-5 py-3 sm:px-6">Speciality</th>
              <th className="px-5 py-3 sm:px-6">Sessions</th>
              <th className="px-5 py-3 sm:px-6">Avg Rating</th>
              <th className="px-5 py-3 sm:px-6">Total Earned</th>
              <th className="px-5 py-3 sm:px-6">MoM</th>
              <th className="px-5 py-3 sm:px-6">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {teacherLeaderboard.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-5 py-8 text-center text-muted sm:px-6">
                  No leaderboard data yet.
                </td>
              </tr>
            ) : (
              teacherLeaderboard.map((teacher) => (
                <tr
                  key={teacher.rank}
                  className="transition-colors hover:bg-slate-50/80"
                >
                  <td className="px-5 py-4 sm:px-6">
                    {teacher.rank === 1 ? (
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700">
                        1
                      </span>
                    ) : (
                      <span className="pl-2 font-semibold text-muted">
                        {teacher.rank}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4 sm:px-6">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy text-xs font-bold text-white">
                        {teacher.initials}
                      </div>
                      <div>
                        <p className="font-semibold text-navy">{teacher.name}</p>
                        <p className="text-xs text-muted">{teacher.status}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 sm:px-6">
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                        specialityPillStyles[teacher.specialityTone],
                      )}
                    >
                      {teacher.speciality}
                    </span>
                  </td>
                  <td className="px-5 py-4 font-semibold text-navy sm:px-6">
                    {teacher.sessions.toLocaleString()}
                  </td>
                  <td className="px-5 py-4 sm:px-6">
                    {teacher.rating > 0 ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-navy">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        {teacher.rating.toFixed(1)}
                      </span>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4 font-bold text-navy sm:px-6">
                    ${teacher.totalEarned.toLocaleString()}
                  </td>
                  <td className="px-5 py-4 sm:px-6">
                    {teacher.mom > 0 ? (
                      <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-emerald-600">
                        <TrendingUp className="h-3 w-3" />+{teacher.mom}%
                      </span>
                    ) : (
                      <span className="text-xs text-muted">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4 sm:px-6">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="h-8 px-3"
                      onClick={() =>
                        toast(`${teacher.name}`, {
                          description: `${teacher.speciality} · ${teacher.sessions.toLocaleString()} sessions`,
                          variant: "info",
                        })
                      }
                    >
                      Profile
                    </Button>
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
