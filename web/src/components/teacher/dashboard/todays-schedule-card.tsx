"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Calendar, Mic, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTeacherDashboard } from "@/contexts/teacher-dashboard-context";
import { cn } from "@/lib/utils";

export function TodaysScheduleCard() {
  const router = useRouter();
  const { speakingSchedule } = useTeacherDashboard();

  return (
    <div className="rounded-xl border border-border bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold text-navy">Today&apos;s Schedule</h2>
          <p className="mt-0.5 text-sm text-muted">
            {speakingSchedule.length} speaking session
            {speakingSchedule.length === 1 ? "" : "s"} scheduled
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
          {speakingSchedule.map((session) => (
            <li
              key={session.id}
              className="flex flex-col gap-4 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sm font-bold text-sky-700">
                  {session.initials}
                </div>
                <div>
                  <p className="font-semibold text-navy">{session.studentName}</p>
                  <p className="text-sm text-muted">{session.timeRange}</p>
                  <p className="text-sm text-sky-600">{session.sessionType}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 sm:shrink-0">
                <span
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide",
                    session.status === "live"
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-sky-50 text-sky-700",
                  )}
                >
                  {session.status === "live" ? "Live" : "Upcoming"}
                </span>
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
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
