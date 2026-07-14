"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  CalendarClock,
  CheckCircle2,
  Clock,
  Headphones,
  Lock,
  Mic,
  PenLine,
  Play,
  Star,
  Video,
} from "lucide-react";
import { useInstStudent } from "@/contexts/inst-student-context";
import { getMockDayHub } from "@/lib/api/students";
import { getErrorMessage } from "@/lib/api/errors";
import { cn } from "@/lib/utils";

type MockDay = Awaited<ReturnType<typeof getMockDayHub>>;
type MockSection = MockDay["sections"][number];

type SkillKey = "listening" | "reading" | "writing" | "speaking";

const SKILL_META: Record<
  SkillKey,
  {
    label: string;
    icon: typeof Headphones;
    duration: string;
    detail: string;
    color: string;
    route: string;
    prev: string | null;
  }
> = {
  listening: {
    label: "Listening",
    icon: Headphones,
    duration: "40 min",
    detail: "40 questions",
    color: "#0ea5e9",
    route: "listening",
    prev: null,
  },
  reading: {
    label: "Reading",
    icon: BookOpen,
    duration: "60 min",
    detail: "40 questions",
    color: "#10b981",
    route: "reading",
    prev: "Listening",
  },
  writing: {
    label: "Writing",
    icon: PenLine,
    duration: "60 min",
    detail: "2 tasks",
    color: "#8b5cf6",
    route: "writing",
    prev: "Reading",
  },
  speaking: {
    label: "Speaking",
    icon: Mic,
    duration: "15 min",
    detail: "Live with examiner",
    color: "#f43f5e",
    route: "speaking",
    prev: "Writing",
  },
};

type SectionStatus = "completed" | "active" | "ready" | "locked";

function resolveStatus(section: {
  completed: boolean;
  active: boolean;
  unlocked?: boolean;
}): SectionStatus {
  if (section.completed) return "completed";
  if (section.active) return "active";
  if (section.unlocked) return "ready";
  return "locked";
}

export function InstStudentMyMockView() {
  const { info } = useInstStudent();
  const [data, setData] = useState<MockDay | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getMockDayHub()
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err) => {
        if (!cancelled)
          setError(getErrorMessage(err, "Could not load your mock."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-navy border-t-transparent" />
      </div>
    );
  }

  const centerName = info?.center?.name ?? "your center";

  if (error) {
    return (
      <div className="p-6 lg:p-8">
        <div className="mx-auto max-w-lg rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-800">
          <p className="font-semibold">Could not load your mock</p>
          <p className="mt-1">{error}</p>
        </div>
      </div>
    );
  }

  const enrollment = data?.enrollment ?? null;

  if (!enrollment) {
    return (
      <div className="mx-auto max-w-4xl p-6 lg:p-8">
        <Header centerName={info?.center?.name} />
        <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-white p-12 text-center shadow-sm">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
            <CalendarClock className="h-6 w-6" />
          </span>
          <p className="mt-4 font-semibold text-navy">No mock assigned yet</p>
          <p className="mt-1 max-w-sm text-sm text-muted">
            {centerName} hasn&apos;t assigned you a mock exam yet. You&apos;ll
            get an email with your exam date and section times once it&apos;s
            scheduled.
          </p>
        </div>
      </div>
    );
  }

  const sessionCode = enrollment.sessionCode;
  const examiner =
    data?.speaking?.examiner ?? data?.writing?.examiner ?? null;
  const sectionsBySkill = new Map<SkillKey, MockSection>();
  for (const s of data?.sections ?? []) {
    const key = s.skill.toLowerCase() as SkillKey;
    if (key in SKILL_META) sectionsBySkill.set(key, s);
  }

  const order: SkillKey[] = ["listening", "reading", "writing", "speaking"];
  const visibleSkills = order.filter((k) => sectionsBySkill.has(k));
  const checkInDone = enrollment.checkInCompleted ?? false;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6 lg:p-8">
      <Header centerName={info?.center?.name} />

      {/* Assigned mock summary */}
      <div className="rounded-2xl border border-border bg-white px-5 py-4 shadow-sm">
        <p className="text-sm text-muted">
          <span className="font-semibold text-navy">
            {enrollment.packageTitle ?? "Full Mock"}
          </span>{" "}
          · Assigned by {centerName} ·{" "}
          {new Date(enrollment.mockDate).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </p>
      </div>

      {/* Examiner card */}
      {examiner && (
        <div className="flex flex-col gap-4 rounded-2xl border border-border bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-navy text-sm font-semibold text-white">
              {examiner
                .split(" ")
                .map((w) => w[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </span>
            <div>
              <p className="font-semibold text-navy">{examiner}</p>
              <p className="text-xs text-muted">
                Your assigned examiner · Writing &amp; Speaking grader
              </p>
            </div>
          </div>
          <div className="flex items-center gap-6 text-center">
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              <span className="text-sm font-bold text-navy">4.9</span>
            </div>
            <div>
              <p className="text-sm font-bold text-navy">
                {info?.center ? "Center" : "—"}
              </p>
              <p className="text-[11px] text-muted">
                {info?.center?.name
                  ? info.center.name
                      .split(" ")
                      .map((w) => w[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()
                  : ""}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Check-in prompt */}
      {!checkInDone && (
        <Link
          href={`/exam/${sessionCode}/check-in`}
          className="flex items-center justify-between rounded-2xl border border-navy/20 bg-navy px-5 py-4 text-white transition-colors hover:bg-navy/90"
        >
          <div>
            <p className="text-sm font-semibold">Complete check-in first</p>
            <p className="text-xs text-slate-300">
              Verify your identity and environment before your first section.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold">
            Enter check-in
          </span>
        </Link>
      )}

      {/* Section cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {visibleSkills.map((key) => {
          const meta = SKILL_META[key];
          const section = sectionsBySkill.get(key)!;
          const status = resolveStatus(section);
          const Icon = meta.icon;
          const locked = status === "locked";

          return (
            <div
              key={key}
              className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm"
            >
              <div className="h-1" style={{ background: meta.color }} />
              <div className="flex flex-col gap-4 p-5">
                <div className="flex items-start justify-between">
                  <span
                    className="flex h-11 w-11 items-center justify-center rounded-xl text-white"
                    style={{ background: locked ? "#cbd5e1" : meta.color }}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <StatusBadge status={status} />
                </div>
                <div>
                  <h3 className="font-bold text-navy">{meta.label}</h3>
                  <div className="mt-2 space-y-1 text-xs text-muted">
                    <p className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      {meta.duration}
                    </p>
                    <p className="flex items-center gap-1.5">
                      <CalendarClock className="h-3.5 w-3.5" />
                      Scheduled {enrollment.mockTime ?? "on the day"}
                    </p>
                    <p className="flex items-center gap-1.5">
                      {key === "speaking" ? (
                        <Video className="h-3.5 w-3.5" />
                      ) : (
                        <BookOpen className="h-3.5 w-3.5" />
                      )}
                      {meta.detail}
                    </p>
                  </div>
                </div>

                {status === "completed" ? (
                  <span className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700">
                    <CheckCircle2 className="h-4 w-4" />
                    Completed
                    {section.band != null ? ` · Band ${section.band.toFixed(1)}` : ""}
                  </span>
                ) : status === "locked" ? (
                  <span className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-400">
                    <Lock className="h-4 w-4" />
                    {meta.prev ? `Complete ${meta.prev} first` : "Locked"}
                  </span>
                ) : (
                  <Link
                    href={`/exam/${sessionCode}/${meta.route}`}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy/90"
                    style={
                      key === "listening"
                        ? { background: "#2563eb" }
                        : undefined
                    }
                  >
                    <Play className="h-4 w-4" fill="white" />
                    {status === "active" ? "Resume" : `Begin ${meta.label}`}
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Speaking booking banner */}
      {data?.speaking?.scheduledAt && (
        <div className="flex items-start gap-3 rounded-2xl border border-sky-200 bg-sky-50 px-5 py-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-600">
            <Video className="h-4 w-4" />
          </span>
          <div className="flex-1 text-sm">
            <p className="font-semibold text-navy">
              Speaking session booked for{" "}
              {new Date(data.speaking.scheduledAt).toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
            <p className="mt-0.5 text-muted">
              Your examiner will send a video call link 5 minutes before your
              slot. If you need to reschedule, contact{" "}
              <span className="font-medium text-navy">{centerName}</span>{" "}
              directly — they manage your exam calendar.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function Header({ centerName }: { centerName?: string }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p className="text-xs font-medium text-muted">Student Portal · My Mock</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-navy sm:text-3xl">
          My Mock
        </h1>
      </div>
      {centerName && (
        <div className="flex items-center gap-2 rounded-full border border-border bg-white px-3 py-1.5">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-navy text-[10px] font-bold text-white">
            {centerName
              .split(" ")
              .map((w) => w[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </span>
          <div className="leading-tight">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted">
              Your Center
            </p>
            <p className="text-xs font-semibold text-navy">{centerName}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: SectionStatus }) {
  if (status === "completed") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
        <CheckCircle2 className="h-3 w-3" />
        Complete
      </span>
    );
  }
  if (status === "active") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-700">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sky-500" />
        In progress
      </span>
    );
  }
  if (status === "ready") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
        Ready
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
      <Lock className="h-3 w-3" />
      Locked
    </span>
  );
}
