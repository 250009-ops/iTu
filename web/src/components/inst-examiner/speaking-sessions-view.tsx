"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Mic } from "lucide-react";
import { useInstExaminer } from "@/contexts/inst-examiner-context";
import {
  getTeacherSpeakingSessions,
  type SpeakingSessionListItem,
} from "@/lib/api/teachers";
import { getErrorMessage } from "@/lib/api/errors";
import { PageHeader, EmptyState } from "@/components/institution/ui";
import { ScopedBanner } from "@/components/inst-examiner/scoped-banner";
import { cn } from "@/lib/utils";

type SessionData = Awaited<ReturnType<typeof getTeacherSpeakingSessions>>;

function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function durationMinutes(startIso: string | null, endIso: string | null): number | null {
  if (!startIso || !endIso) return null;
  const mins = Math.round(
    (new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000,
  );
  return mins > 0 ? mins : null;
}

function SessionRow({
  session,
  completed,
}: {
  session: SpeakingSessionListItem;
  completed?: boolean;
}) {
  const mins = durationMinutes(session.scheduledAt, session.endsAt);
  const meta = [
    formatTime(session.scheduledAt),
    mins != null ? `${mins} min` : null,
    session.packageTitle,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex items-center gap-4 rounded-xl border border-border bg-white px-5 py-4 shadow-sm">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-rose-100 text-sm font-bold text-rose-600">
        {initials(session.studentName)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-navy">
          {session.studentName}
        </p>
        <p className="text-xs text-muted">{meta}</p>
      </div>
      {completed ? (
        <div className="flex items-center gap-3">
          {session.grade && (
            <span className="inline-flex items-center rounded-md bg-emerald-50 px-2.5 py-1 text-sm font-bold text-emerald-700 ring-1 ring-inset ring-emerald-200">
              {session.grade.overallBand.toFixed(1)}
            </span>
          )}
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
            <CheckCircle2 className="h-4 w-4" /> Graded
          </span>
        </div>
      ) : (
        <Link
          href={`/inst-examiner/speaking?session=${session.id}`}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-red px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-red/90"
        >
          <Mic className="h-4 w-4" /> Start Grading
        </Link>
      )}
    </div>
  );
}

export function InstExaminerSpeakingView() {
  const { info } = useInstExaminer();
  const [data, setData] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getTeacherSpeakingSessions()
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err) => {
        if (!cancelled)
          setError(getErrorMessage(err, "Could not load speaking sessions."));
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

  const upcoming = [...data.today, ...data.upcoming].filter(
    (s) => s.uiStatus === "upcoming" || s.uiStatus === "live",
  );
  const completed = data.completed;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 sm:p-6">
      <PageHeader
        breadcrumb="Examiner Portal › Speaking Sessions"
        title="Speaking Sessions"
        description={`Centre students only · ${upcoming.length} upcoming · ${data.counts.completed} completed today`}
      />

      <ScopedBanner
        centerName={centerName}
        message={
          <>
            Only sessions for students enrolled through{" "}
            <span className="font-semibold text-navy">{centerName}</span>.
            Marketplace students are excluded.
          </>
        }
      />

      <section className="flex flex-col gap-3">
        <p className="text-xs font-bold uppercase tracking-wide text-muted">
          Upcoming · {upcoming.length}
        </p>
        {upcoming.length === 0 ? (
          <EmptyState message="No upcoming speaking sessions." />
        ) : (
          upcoming.map((s) => <SessionRow key={s.id} session={s} />)
        )}
      </section>

      {completed.length > 0 && (
        <section className="flex flex-col gap-3">
          <p className="text-xs font-bold uppercase tracking-wide text-muted">
            Completed Today · {completed.length}
          </p>
          {completed.map((s) => (
            <SessionRow key={s.id} session={s} completed />
          ))}
        </section>
      )}
    </div>
  );
}
