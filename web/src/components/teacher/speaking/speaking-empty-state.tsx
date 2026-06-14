"use client";

import Link from "next/link";
import { ArrowRight, Calendar, Mic, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { mapSpeakingSchedule } from "@/lib/api/mappers/teacher";

type ScheduleItem = ReturnType<typeof mapSpeakingSchedule>[number];

export function SpeakingEmptyState({
  todaySessions = [],
}: {
  todaySessions?: ScheduleItem[];
}) {
  return (
    <div className="p-4 lg:p-6 xl:p-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy sm:text-3xl">
            Speaking Examiner Console
          </h1>
          <p className="mt-1 text-sm text-muted">
            Live speaking sessions with your assigned students
          </p>
        </div>

        <div className="rounded-2xl border border-dashed border-border bg-white px-6 py-10 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-sky-100 text-sky-600">
            <Mic size={26} />
          </div>
          <h2 className="mt-5 text-lg font-bold text-navy">
            No speaking session right now
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">
            When a student books your speaking slot, the live console opens here
            on session day. You can start the interview, score in real time, and
            submit the band.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/teacher/availability">
              <Button variant="secondary">
                <Calendar className="h-4 w-4" />
                Manage Availability
              </Button>
            </Link>
            <Link href="/teacher/dashboard">
              <Button variant="danger">
                Back to Dashboard
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>

        {todaySessions.length > 0 && (
          <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
            <h3 className="font-semibold text-navy">Scheduled for today</h3>
            <ul className="mt-4 space-y-3">
              {todaySessions.map((session) => (
                <li
                  key={session.id}
                  className="flex items-center justify-between gap-4 rounded-lg border border-border px-4 py-3"
                >
                  <div>
                    <p className="font-semibold text-navy">{session.studentName}</p>
                    <p className="text-sm text-muted">{session.timeRange}</p>
                  </div>
                  <Link href={`/teacher/speaking?session=${session.id}`}>
                    <Button size="sm">
                      <Play className="h-3.5 w-3.5 fill-current" />
                      Open
                    </Button>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
