"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Calendar, Mic, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTeacherDashboard } from "@/contexts/teacher-dashboard-context";
import type { SpeakingSessionUiStatus } from "@/lib/api/mappers/teacher";
import { cn } from "@/lib/utils";

function scheduleStatusStyle(status: SpeakingSessionUiStatus): {
  label: string;
  className: string;
} {
  switch (status) {
    case "live":
      return { label: "Live", className: "bg-emerald-50 text-emerald-700" };
    case "awaiting_grade":
      return {
        label: "Awaiting grade",
        className: "bg-amber-50 text-amber-700",
      };
    case "graded":
      return { label: "Graded", className: "bg-emerald-50 text-emerald-700" };
    case "no_show":
      return {
        label: "Student absent",
        className: "bg-rose-50 text-rose-700",
      };
    case "cancelled":
      return { label: "Cancelled", className: "bg-slate-100 text-slate-500" };
    default:
      return { label: "Upcoming", className: "bg-sky-50 text-sky-700" };
  }
}

export function TodaysScheduleCard() {
  const router = useRouter();
  const { speakingSchedule } = useTeacherDashboard();
  const openCount = speakingSchedule.filter(
    (s) => s.status === "upcoming" || s.status === "live",
  ).length;

  return (
    <div className="rounded-xl border border-border bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold text-navy">Today&apos;s Schedule</h2>
          <p className="mt-0.5 text-sm text-muted">
            {speakingSchedule.length === 0
              ? "No speaking sessions today"
              : openCount > 0
                ? `${openCount} open · ${speakingSchedule.length} today`
                : `${speakingSchedule.length} speaking session${speakingSchedule.length === 1 ? "" : "s"} today`}
          </p>
        </div>
        <Link
          href="/teacher/speaking"
          className="flex shrink-0 items-center gap-1 text-sm font-semibold text-sky-600 hover:text-sky-700"
        >
          View all
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {speakingSchedule.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-border bg-slate-50 px-5 py-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-sky-100 text-sky-600">
            <Mic size={22} />
          </div>
          <p className="mt-4 font-semibold text-navy">No sessions today</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
            Speaking sessions appear here when students book your available
            slots. Open your calendar to add more availability.
          </p>
          <Link href="/teacher/availability" className="mt-4 inline-block">
            <Button variant="secondary" size="sm">
              <Calendar className="h-4 w-4" />
              Manage Availability
            </Button>
          </Link>
        </div>
      ) : (
        <ul className="mt-5 space-y-4">
          {speakingSchedule.map((session) => {
            const badge = scheduleStatusStyle(session.status);
            const canStart =
              session.status === "upcoming" || session.status === "live";
            const needsGrade = session.status === "awaiting_grade";
            const canReview =
              session.status === "graded" || session.status === "awaiting_grade";

            return (
              <li
                key={session.id}
                className="flex flex-col gap-4 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sm font-bold text-sky-700">
                    {session.initials}
                  </div>
                  <div>
                    <p className="font-semibold text-navy">
                      {session.studentName}
                    </p>
                    <p className="text-sm text-muted">{session.timeRange}</p>
                    <p className="text-sm text-sky-600">{session.sessionType}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 sm:shrink-0">
                  <span
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide",
                      badge.className,
                    )}
                  >
                    {session.status === "graded" && session.overallBand != null
                      ? `Graded ${
                          session.overallBand % 1 === 0
                            ? session.overallBand.toFixed(0)
                            : session.overallBand.toFixed(1)
                        }`
                      : badge.label}
                  </span>
                  {canStart ? (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() =>
                        router.push(`/teacher/speaking?session=${session.id}`)
                      }
                    >
                      <Play className="h-3.5 w-3.5 fill-current" />
                      Start Session
                    </Button>
                  ) : needsGrade ? (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() =>
                        router.push(`/teacher/speaking?session=${session.id}`)
                      }
                    >
                      Score now
                    </Button>
                  ) : canReview ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        router.push(`/teacher/speaking?session=${session.id}`)
                      }
                    >
                      Review
                    </Button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
