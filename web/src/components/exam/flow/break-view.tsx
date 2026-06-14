"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Coffee, Headphones, PenLine } from "lucide-react";
import { ExamInterstitialHeader } from "@/components/exam/flow/exam-interstitial-header";
import { useCountdown } from "@/lib/exam/use-countdown";
import { formatClock } from "@/lib/exam/helpers";
import { startSection } from "@/lib/api/exam";
import type { ExamSkill } from "@/lib/exam/types";
import { cn } from "@/lib/utils";

const SECTION_META: Record<
  string,
  { label: string; icon: React.ReactNode; color: string }
> = {
  listening: { label: "Listening", icon: <Headphones size={16} />, color: "bg-blue-600" },
  reading: { label: "Reading", icon: <BookOpen size={16} />, color: "bg-emerald-600" },
  writing: { label: "Writing", icon: <PenLine size={16} />, color: "bg-violet-600" },
};

const BREAK_SECONDS = 20;

const VALID_SKILLS = new Set<string>(["listening", "reading", "writing", "speaking"]);

function toExamSkill(next: string): ExamSkill | null {
  return VALID_SKILLS.has(next) ? (next as ExamSkill) : null;
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
  const remaining = useCountdown(BREAK_SECONDS);
  const [continuing, setContinuing] = useState(false);
  const fromMeta = SECTION_META[from];
  const nextMeta = SECTION_META[next];
  const ready = remaining <= 0;

  async function handleContinue() {
    const skill = toExamSkill(next);
    if (!skill) return;
    setContinuing(true);
    try {
      await startSection(sessionId, skill);
      router.push(`/exam/${sessionId}/${next}`);
    } finally {
      setContinuing(false);
    }
  }

  return (
    <>
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
              Break ends in
            </p>
            <p className="mt-1 text-5xl font-bold tabular-nums text-navy">
              {formatClock(remaining)}
            </p>
            <p className="mt-3 text-[13px] text-slate-500">
              This break is timed and cannot be skipped. Please do not access any
              study material.
            </p>
          </div>

          <button
            type="button"
            disabled={!ready || continuing}
            onClick={() => void handleContinue()}
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
