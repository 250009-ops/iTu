"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, BookOpen, Coffee, Headphones, PenLine } from "lucide-react";
import { ExamInterstitialHeader } from "@/components/exam/flow/exam-interstitial-header";
import { ExamIntegrityWarning } from "@/components/exam/shell/exam-integrity-warning";
import { useCountdown, useStopwatch } from "@/lib/exam/use-countdown";
import { formatClock } from "@/lib/exam/helpers";
import { getExamSession, startSection } from "@/lib/api/exam";
import type { ExamSkill } from "@/lib/exam/types";
import {
  examBreakRoute,
  examResumeRoute,
  examRouteAfterSection,
  expectedNextSkillFromSessionState,
  skillFromSubmittedState,
} from "@/lib/exam/package-skills";
import { useExamIntegrity } from "@/hooks/use-exam-integrity";
import { cn } from "@/lib/utils";

const BREAK_SECONDS = 30;
const AUTO_CONTINUE_SECONDS = 60;

const SECTION_META: Record<
  string,
  { label: string; icon: React.ReactNode; color: string }
> = {
  listening: { label: "Listening", icon: <Headphones size={16} />, color: "bg-blue-600" },
  reading: { label: "Reading", icon: <BookOpen size={16} />, color: "bg-emerald-600" },
  writing: { label: "Writing", icon: <PenLine size={16} />, color: "bg-violet-600" },
};

const VALID_SKILLS = new Set<string>(["listening", "reading", "writing", "speaking"]);

function toExamSkill(value: string): ExamSkill | null {
  return VALID_SKILLS.has(value) ? (value as ExamSkill) : null;
}

export function BreakView({
  sessionId,
  from,
  next,
}: {
  sessionId: string;
  from: string;
  next: string;
}) {
  const router = useRouter();
  const breakRemaining = useCountdown(BREAK_SECONDS);
  const breakEnded = breakRemaining <= 0;
  const idleAfterBreak = useStopwatch(breakEnded);
  const autoRemaining = Math.max(0, AUTO_CONTINUE_SECONDS - idleAfterBreak);
  const [continuing, setContinuing] = useState(false);
  const [routeSynced, setRouteSynced] = useState(false);
  const autoStartedRef = useRef(false);
  const { warning, dismissWarning } = useExamIntegrity(sessionId);

  const fromMeta = SECTION_META[from];
  const nextMeta = SECTION_META[next];
  const ready = breakEnded;

  const continueToNext = useCallback(async () => {
    if (continuing) return;
    setContinuing(true);
    try {
      const session = await getExamSession(sessionId);
      const skills = session.enrollment.package.skills;
      const hubOpts = {
        institutionGranted: session.enrollment.institutionGranted,
      };
      const expected = expectedNextSkillFromSessionState(session.state, skills);

      if (!expected) {
        router.replace(examResumeRoute(sessionId, session.state, skills, hubOpts));
        return;
      }

      const expectedSection = session.sections.find((s) => s.skill === expected);
      if (expectedSection?.submittedAt) {
        router.replace(examRouteAfterSection(sessionId, skills, expected, hubOpts));
        return;
      }

      if (session.state === `${expected}_active`) {
        router.replace(`/exam/${sessionId}/${expected}`);
        return;
      }

      await startSection(sessionId, expected);
      router.replace(`/exam/${sessionId}/${expected}`);
    } catch {
      try {
        const session = await getExamSession(sessionId);
        router.replace(
          examResumeRoute(
            sessionId,
            session.state,
            session.enrollment.package.skills,
            { institutionGranted: session.enrollment.institutionGranted },
          ),
        );
      } catch {
        // leave user on break with button enabled for retry
      }
    } finally {
      setContinuing(false);
    }
  }, [continuing, router, sessionId]);

  // Align break URL with server state (e.g. after admin force-submit skipped ahead).
  useEffect(() => {
    let active = true;

    async function syncRoute() {
      try {
        const session = await getExamSession(sessionId);
        if (!active) return;

        const skills = session.enrollment.package.skills;
        const hubOpts = {
          institutionGranted: session.enrollment.institutionGranted,
        };
        const expected = expectedNextSkillFromSessionState(session.state, skills);
        const nextSkill = toExamSkill(next);

        if (!expected) {
          router.replace(examResumeRoute(sessionId, session.state, skills, hubOpts));
          return;
        }

        if (session.state === `${expected}_active`) {
          router.replace(`/exam/${sessionId}/${expected}`);
          return;
        }

        const expectedSection = session.sections.find((s) => s.skill === expected);
        if (expectedSection?.submittedAt) {
          router.replace(examRouteAfterSection(sessionId, skills, expected, hubOpts));
          return;
        }

        if (nextSkill && expected !== nextSkill) {
          const submitted = skillFromSubmittedState(session.state);
          if (submitted) {
            router.replace(examBreakRoute(sessionId, submitted, expected));
            return;
          }
          router.replace(examResumeRoute(sessionId, session.state, skills, hubOpts));
          return;
        }
      } finally {
        if (active) setRouteSynced(true);
      }
    }

    void syncRoute();
    return () => {
      active = false;
    };
  }, [sessionId, next, router]);

  // Auto-start next section 1 minute after the break ends.
  useEffect(() => {
    if (!breakEnded || autoStartedRef.current || continuing || !routeSynced) return;
    if (idleAfterBreak < AUTO_CONTINUE_SECONDS) return;

    autoStartedRef.current = true;
    void continueToNext();
  }, [breakEnded, idleAfterBreak, continuing, routeSynced, continueToNext]);

  if (!routeSynced) {
    return (
      <>
        <ExamInterstitialHeader sessionId={sessionId} label="Break" />
        <main className="flex min-h-0 flex-1 items-center justify-center bg-slate-50">
          <p className="text-sm text-slate-500">Loading break…</p>
        </main>
      </>
    );
  }

  return (
    <>
      <ExamIntegrityWarning warning={warning} onDismiss={dismissWarning} />

      <ExamInterstitialHeader sessionId={sessionId} label="Break" />
      <main className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto bg-slate-50 px-5 py-8">
        <div className="w-full max-w-md text-center">
          <div className="flex justify-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-600">
              <Coffee size={30} />
            </span>
          </div>
          <h1 className="mt-5 text-2xl font-bold text-navy">Short break</h1>

          {fromMeta && (
            <p className="mt-2 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-[13px] font-medium text-emerald-700">
              <span className={cn("flex h-5 w-5 items-center justify-center rounded text-white", fromMeta.color)}>
                {fromMeta.icon}
              </span>
              {fromMeta.label} submitted
            </p>
          )}

          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
            <p className="text-[12px] font-semibold uppercase tracking-wider text-slate-400">
              {breakEnded ? "Break ended" : "Break ends in"}
            </p>
            <p className="mt-1 text-5xl font-bold tabular-nums text-navy">
              {breakEnded ? "00:00" : formatClock(breakRemaining)}
            </p>
            <p className="mt-3 text-[13px] text-slate-500">
              This break is timed and cannot be skipped. Stay in full screen and do
              not access any study material.
            </p>
          </div>

          {breakEnded && autoRemaining > 0 && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-[13px] text-amber-900">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <p>
                {nextMeta?.label ?? "The next section"} will start automatically in{" "}
                <span className="font-bold tabular-nums">{formatClock(autoRemaining)}</span>{" "}
                if you do not continue. Click below when you are ready.
              </p>
            </div>
          )}

          <button
            type="button"
            disabled={!ready || continuing}
            onClick={() => void continueToNext()}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-red px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-red-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {nextMeta && (
              <span className="flex h-5 w-5 items-center justify-center">
                {nextMeta.icon}
              </span>
            )}
            {continuing
              ? "Starting next section…"
              : ready
                ? `Continue to ${nextMeta?.label ?? "next section"}`
                : "Please wait for the break to end"}
          </button>
        </div>
      </main>
    </>
  );
}
