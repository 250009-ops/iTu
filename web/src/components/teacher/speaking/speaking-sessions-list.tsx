"use client";

import Link from "next/link";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import type {
  MappedSpeakingSessionItem,
  SpeakingSessionUiStatus,
} from "@/lib/api/mappers/teacher";
import { cn } from "@/lib/utils";

function StatusBadge({
  uiStatus,
  overallBand,
}: {
  uiStatus: SpeakingSessionUiStatus;
  overallBand: number | null;
}) {
  if (uiStatus === "graded" && overallBand != null) {
    return (
      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
        Graded {overallBand % 1 === 0 ? overallBand.toFixed(0) : overallBand.toFixed(1)}
      </span>
    );
  }

  const styles: Record<
    SpeakingSessionUiStatus,
    { label: string; className: string }
  > = {
    upcoming: {
      label: "Upcoming",
      className: "bg-slate-100 text-slate-600",
    },
    live: {
      label: "Live",
      className: "bg-red-50 text-brand-red",
    },
    awaiting_grade: {
      label: "Awaiting grade",
      className: "bg-amber-50 text-amber-700",
    },
    graded: {
      label: "Graded",
      className: "bg-emerald-50 text-emerald-700",
    },
  };

  const style = styles[uiStatus];
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-1 text-xs font-bold",
        style.className,
      )}
    >
      {style.label}
    </span>
  );
}

function SessionAction({ session }: { session: MappedSpeakingSessionItem }) {
  if (session.uiStatus === "graded") {
    return (
      <Link href={`/teacher/speaking?session=${session.id}`}>
        <Button variant="secondary" size="sm">
          Review
        </Button>
      </Link>
    );
  }

  if (session.uiStatus === "awaiting_grade") {
    return (
      <Link href={`/teacher/speaking?session=${session.id}`}>
        <Button variant="danger" size="sm">
          Score now
        </Button>
      </Link>
    );
  }

  const href =
    session.uiStatus === "live"
      ? `/teacher/speaking?session=${session.id}&live=1`
      : `/teacher/speaking?session=${session.id}`;

  return (
    <Link href={href}>
      <Button variant="danger" size="sm">
        <Play className="h-3.5 w-3.5 fill-current" />
        Open console
      </Button>
    </Link>
  );
}

export function SpeakingSessionsList({
  title,
  sessions,
  emptyTitle,
  emptyDescription,
}: {
  title: string;
  sessions: MappedSpeakingSessionItem[];
  emptyTitle: string;
  emptyDescription: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-white shadow-sm">
      <div className="border-b border-border px-5 py-4">
        <h2 className="font-semibold text-navy">{title}</h2>
      </div>

      {sessions.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <p className="font-medium text-navy">{emptyTitle}</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
            {emptyDescription}
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {sessions.map((session) => (
            <li
              key={session.id}
              className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                    session.colors.bg,
                    session.colors.text,
                  )}
                >
                  {session.initials}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-navy">
                    {session.studentName}
                  </p>
                  <p className="text-sm text-muted">{session.timeRange}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 sm:shrink-0">
                <StatusBadge
                  uiStatus={session.uiStatus}
                  overallBand={session.overallBand}
                />
                <SessionAction session={session} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function SpeakingUpcomingList({
  sessions,
}: {
  sessions: MappedSpeakingSessionItem[];
}) {
  return (
    <div className="rounded-xl border border-border bg-white shadow-sm">
      <div className="border-b border-border px-5 py-4">
        <h2 className="font-semibold text-navy">Upcoming Sessions</h2>
      </div>

      {sessions.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <p className="font-medium text-navy">No upcoming sessions</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
            Future speaking bookings appear here once students reserve your
            availability.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {sessions.map((session) => (
            <li
              key={session.id}
              className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                    session.colors.bg,
                    session.colors.text,
                  )}
                >
                  {session.initials}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-navy">
                    {session.studentName}
                  </p>
                  <p className="text-sm text-muted">{session.dateTimeLabel}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 sm:shrink-0">
                <StatusBadge uiStatus="upcoming" overallBand={null} />
                <Link href={`/teacher/speaking?session=${session.id}`}>
                  <Button variant="danger" size="sm">
                    <Play className="h-3.5 w-3.5 fill-current" />
                    Open console
                  </Button>
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
