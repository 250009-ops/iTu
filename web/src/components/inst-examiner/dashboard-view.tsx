"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Mic,
  PenLine,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useInstExaminer } from "@/contexts/inst-examiner-context";
import {
  canAccessSpeaking,
  canAccessWriting,
} from "@/lib/inst-examiner/speciality";
import {
  getInstExaminerOverview,
  type InstExaminerOverview,
  type InstExaminerTodaySpeaking,
} from "@/lib/api/inst-examiner";
import { getErrorMessage } from "@/lib/api/errors";
import { StatCard, SectionCard, EmptyState } from "@/components/institution/ui";
import { cn } from "@/lib/utils";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function firstName(name: string): string {
  return name.split(" ").filter(Boolean)[0] ?? name;
}

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

function formatDay(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 60) return `${Math.max(mins, 1)}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function speakingStatusLabel(
  uiStatus: InstExaminerTodaySpeaking["uiStatus"],
): { label: string; className: string } {
  switch (uiStatus) {
    case "graded":
      return {
        label: "Graded",
        className:
          "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200",
      };
    case "awaiting_grade":
      return {
        label: "Awaiting grade",
        className:
          "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200",
      };
    case "live":
      return {
        label: "Live",
        className: "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200",
      };
    case "no_show":
      return {
        label: "Student absent",
        className: "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200",
      };
    case "cancelled":
      return {
        label: "Cancelled",
        className:
          "bg-slate-100 text-slate-500 ring-1 ring-inset ring-slate-200",
      };
    default:
      return {
        label: "Upcoming",
        className:
          "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200",
      };
  }
}

function Avatar({ name, tint = "rose" }: { name: string; tint?: "rose" | "violet" | "sky" }) {
  const tints = {
    rose: "bg-rose-100 text-rose-600",
    violet: "bg-violet-100 text-violet-600",
    sky: "bg-sky-100 text-sky-600",
  };
  return (
    <span
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold",
        tints[tint],
      )}
    >
      {initials(name)}
    </span>
  );
}

function BandChip({ band, delta }: { band: number | null; delta?: number | null }) {
  if (band == null) {
    return <span className="text-xs text-muted">No results yet</span>;
  }
  return (
    <div className="flex items-center gap-1.5">
      <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 ring-1 ring-inset ring-emerald-200">
        {band.toFixed(1)}
      </span>
      {delta != null && delta !== 0 && (
        <span
          className={cn(
            "text-[11px] font-semibold",
            delta > 0 ? "text-emerald-600" : "text-rose-500",
          )}
        >
          {delta > 0 ? "+" : ""}
          {delta.toFixed(1)}
        </span>
      )}
    </div>
  );
}

export function InstExaminerDashboardView() {
  const { info, speciality } = useInstExaminer();
  const [data, setData] = useState<InstExaminerOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getInstExaminerOverview()
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err) => {
        if (!cancelled)
          setError(getErrorMessage(err, "Could not load your dashboard."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const centerName = info?.center?.name ?? data?.center?.name ?? "your center";
  const name = data?.examiner.name ?? info?.name ?? "there";

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

  const { stats, todaySpeaking, writingQueue, recentlyGraded, students } = data;
  const showSpeaking = canAccessSpeaking(speciality);
  const showWriting = canAccessWriting(speciality);
  const visibleRecentlyGraded = recentlyGraded.filter((g) =>
    g.type === "speaking" ? showSpeaking : showWriting,
  );

  const workloadParts: string[] = [];
  if (showSpeaking) {
    workloadParts.push(
      `${stats.sessionsToday} speaking session${stats.sessionsToday === 1 ? "" : "s"} scheduled`,
    );
  }
  if (showWriting) {
    workloadParts.push(
      `${stats.writingQueue} writing submission${stats.writingQueue === 1 ? "" : "s"} to grade`,
    );
  }
  const workloadSummary =
    workloadParts.length > 0 ? workloadParts.join(" · ") : "No pending work today";

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 sm:p-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-navy px-6 py-7 text-white sm:px-8">
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm text-slate-300">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
            <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
              {greeting()}, {firstName(name)}
            </h1>
            <p className="mt-1 text-sm text-slate-300">{workloadSummary}</p>
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3 ring-1 ring-inset ring-white/15">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 text-xs font-bold">
              {initials(centerName)}
            </span>
            <div className="leading-tight">
              <p className="text-sm font-semibold">{centerName}</p>
              <p className="text-[11px] text-slate-300">Centre partner</p>
            </div>
            <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-violet-500/20 px-2 py-0.5 text-[11px] font-semibold text-violet-200 ring-1 ring-inset ring-violet-400/30">
              <ShieldCheck className="h-3 w-3" /> Scoped
            </span>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div
        className={cn(
          "grid gap-4",
          showSpeaking && showWriting
            ? "grid-cols-2 lg:grid-cols-4"
            : "grid-cols-2 lg:grid-cols-3",
        )}
      >
        {showSpeaking && (
          <StatCard
            label="Today's Sessions"
            value={stats.sessionsToday}
            hint={`${stats.sessionsCompletedToday} completed`}
          />
        )}
        {showWriting && (
          <StatCard
            label="Writing Queue"
            value={stats.writingQueue}
            hint="pending + in review"
            accent="red"
          />
        )}
        <StatCard
          label="Centre Students"
          value={stats.centreStudents}
          hint="assigned by centre"
          accent="violet"
        />
        <StatCard
          label="Avg Band Given"
          value={stats.avgBandGiven != null ? stats.avgBandGiven.toFixed(1) : "—"}
          hint={
            stats.avgBandDelta != null && stats.avgBandDelta !== 0
              ? `${stats.avgBandDelta > 0 ? "↑" : "↓"} ${Math.abs(
                  stats.avgBandDelta,
                ).toFixed(1)} this month`
              : "this period"
          }
          accent="emerald"
        />
      </div>

      {/* Scoped access banner */}
      <div className="flex flex-col gap-4 rounded-xl border border-violet-200 bg-violet-50/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
            <ShieldCheck className="h-4 w-4" />
          </span>
          <div className="text-sm text-slate-600">
            <p className="font-semibold text-navy">Scoped Examiner Access</p>
            <p className="mt-0.5">
              You see and grade only students enrolled through{" "}
              <span className="font-semibold text-navy">{centerName}</span>.
              Marketplace availability and independent payouts are managed by the
              centre.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-6 sm:pl-4">
          <div className="text-center">
            <p className="text-xl font-bold text-navy">{stats.centreStudents}</p>
            <p className="text-[11px] text-muted">Students</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-navy">{stats.activeMocks}</p>
            <p className="text-[11px] text-muted">Active mocks</p>
          </div>
        </div>
      </div>

      {(showSpeaking || showWriting) && (
        <div
          className={cn(
            "grid grid-cols-1 gap-6",
            showSpeaking && showWriting && "lg:grid-cols-2",
          )}
        >
          {showSpeaking && (
            <SectionCard
              title="Today's Speaking"
              action={
                <Link
                  href="/inst-examiner/speaking"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-brand-red hover:underline"
                >
                  Open queue <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              }
            >
              {todaySpeaking.length === 0 ? (
                <EmptyState message="No speaking sessions scheduled today." />
              ) : (
                <ul className="divide-y divide-border">
                  {todaySpeaking.map((s) => {
                    const status = speakingStatusLabel(s.uiStatus);
                    return (
                    <li key={s.id}>
                      <Link
                        href={`/inst-examiner/speaking?session=${encodeURIComponent(s.id)}`}
                        className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-slate-50"
                      >
                      <Avatar name={s.studentName} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-navy">
                          {s.studentName}
                        </p>
                        <p className="text-xs text-muted">
                          {formatTime(s.scheduledAt)}
                          {s.enrollmentCode ? ` · ${s.enrollmentCode}` : ""}
                        </p>
                      </div>
                      {s.graded && s.band != null ? (
                        <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                          {s.band.toFixed(1)}
                        </span>
                      ) : (
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
                            status.className,
                          )}
                        >
                          {status.label}
                        </span>
                      )}
                      </Link>
                    </li>
                    );
                  })}
                </ul>
              )}
            </SectionCard>
          )}

          {showWriting && (
            <SectionCard
              title="Writing Queue"
              action={
                <Link
                  href="/inst-examiner/grading"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-brand-red hover:underline"
                >
                  Grade all <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              }
            >
              {writingQueue.length === 0 ? (
                <EmptyState message="No writing submissions waiting (pending or in review)." />
              ) : (
                <ul className="divide-y divide-border">
                  {writingQueue.map((w) => (
                    <li key={w.id}>
                      <Link
                        href={`/inst-examiner/grading/${encodeURIComponent(w.id)}`}
                        className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-slate-50"
                      >
                      <Avatar name={w.studentName} tint="violet" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-navy">
                          {w.studentName}
                        </p>
                        <p className="text-xs text-muted">
                          {w.examType} {w.taskLabel} · {relativeTime(w.submittedAt)}
                          {w.aiEstimate != null
                            ? ` · AI est. ${w.aiEstimate.toFixed(1)}`
                            : ""}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset",
                          w.priority === "urgent"
                            ? "bg-rose-50 text-rose-600 ring-rose-200"
                            : "bg-slate-100 text-slate-500 ring-slate-200",
                        )}
                      >
                        {w.priority}
                      </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>
          )}
        </div>
      )}

      {/* Recently Graded + Your Students */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SectionCard
          title={
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Recently
              Graded
            </span>
          }
        >
          {visibleRecentlyGraded.length === 0 ? (
            <EmptyState message="Nothing graded yet." />
          ) : (
            <ul className="divide-y divide-border">
              {visibleRecentlyGraded.map((g) => {
                const href =
                  g.type === "writing" && g.writingSubmissionId
                    ? `/inst-examiner/grading/${encodeURIComponent(g.writingSubmissionId)}`
                    : g.type === "speaking" && g.speakingSessionId
                      ? `/inst-examiner/speaking?session=${encodeURIComponent(g.speakingSessionId)}`
                      : null;
                const inner = (
                  <>
                    <Avatar name={g.studentName} tint="sky" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-navy">
                        {g.studentName}
                      </p>
                      <p className="flex items-center gap-1 text-xs capitalize text-muted">
                        {g.type === "speaking" ? (
                          <Mic className="h-3 w-3" />
                        ) : (
                          <PenLine className="h-3 w-3" />
                        )}
                        {g.type} · {formatDay(g.gradedAt)}
                      </p>
                    </div>
                    <span className="inline-flex items-center rounded-md bg-navy px-2 py-0.5 text-xs font-bold text-white">
                      {g.band.toFixed(1)}
                    </span>
                  </>
                );
                return (
                  <li key={g.id}>
                    {href ? (
                      <Link
                        href={href}
                        className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-slate-50"
                      >
                        {inner}
                      </Link>
                    ) : (
                      <div className="flex items-center gap-3 px-5 py-3.5">
                        {inner}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          title={
            <span className="flex items-center gap-2">
              <Users className="h-4 w-4 text-violet-500" /> Your Students
            </span>
          }
          action={
            <Link
              href={
                showSpeaking
                  ? "/inst-examiner/speaking"
                  : "/inst-examiner/grading"
              }
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand-red hover:underline"
            >
              {students.length} total <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
        >
          {students.length === 0 ? (
            <EmptyState message="No students assigned by the centre yet." />
          ) : (
            <ul className="divide-y divide-border">
              {students.map((s) => (
                <li key={s.id} className="flex items-center gap-3 px-5 py-3.5">
                  <Avatar name={s.name} tint="violet" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-navy">
                      {s.name}
                    </p>
                    <p className="text-xs text-muted">
                      {s.targetBand != null ? `Target ${s.targetBand}` : "No target"}
                      {s.nextMockDate
                        ? ` · Next: ${formatDay(s.nextMockDate)}`
                        : ""}
                    </p>
                  </div>
                  <BandChip band={s.latestBand} delta={s.delta} />
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
