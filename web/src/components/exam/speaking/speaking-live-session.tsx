"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, CircleDot, Loader2, Radio } from "lucide-react";
import { BrandMarkIcon } from "@/components/brand/brand-mark";
import type { SpeakingContent } from "@/lib/exam/types";
import { SpeakingCueCard } from "@/components/exam/speaking/speaking-cue-card";
import { useCountdown, useStopwatch } from "@/lib/exam/use-countdown";
import { formatClock } from "@/lib/exam/helpers";
import { startSection, submitSection } from "@/lib/api/exam";
import { useAuth, getInitials } from "@/hooks/use-auth";
import { useSpeakingRoom } from "@/contexts/speaking-room-context";
import { SpeakingVideoLayout } from "@/components/speaking/speaking-video-layout";
import { phaseToPart, type SpeakingPhase } from "@/lib/speaking/sync";
import { cn } from "@/lib/utils";

export function SpeakingLiveSession({
  sessionId,
  content,
  onComplete,
}: {
  sessionId: string;
  content: SpeakingContent;
  onComplete: () => void;
}) {
  const { session: authSession } = useAuth();
  const studentInitials = getInitials(authSession?.name ?? "Student");
  const examinerInitials = getInitials(content.examiner);
  const { phase, state } = useSpeakingRoom();
  const [started, setStarted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const elapsed = useStopwatch(true);

  useEffect(() => {
    if (started) return;
    void startSection(sessionId, "speaking")
      .then(() => setStarted(true))
      .catch(() => setStarted(true));
  }, [sessionId, started]);

  useEffect(() => {
    if (phase !== "complete" || submitting) return;
    setSubmitting(true);
    void submitSection(sessionId, "speaking")
      .then(() => onComplete())
      .catch(() => onComplete());
  }, [phase, sessionId, onComplete, submitting]);

  const activePart = phaseToPart(phase);
  const partMeta = content.parts[activePart - 1];
  const showCueCard = phase === "part2-prep" || phase === "part2-speak";

  const statusLabel =
    phase === "complete"
      ? "Session complete"
      : activePart === 1
        ? "Part 1 — Introduction"
        : activePart === 2
          ? phase === "part2-prep"
            ? "Part 2 — Preparation"
            : "Part 2 — Long turn"
          : "Part 3 — Discussion";

  return (
    <>
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-700 bg-[#1b2a4a] px-4 text-white">
        <div className="flex items-center gap-3">
          <BrandMarkIcon size="md" />
          <span className="text-sm font-semibold">itestu · Speaking</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 rounded-full bg-rose-500/20 px-3 py-1 text-[12px] font-semibold text-rose-200">
            <Radio size={13} className="animate-pulse" /> Recording
          </span>
          <span className="text-[13px] tabular-nums text-slate-300">
            {formatClock(elapsed)}
          </span>
        </div>
      </header>

      <div className="flex shrink-0 items-center justify-center border-b border-slate-200 bg-white px-5 py-2.5">
        <p className="text-[14px] font-semibold text-navy">{statusLabel}</p>
      </div>

      <main className="relative min-h-0 flex-1 bg-slate-900 p-4">
        <SpeakingVideoLayout
          remoteLabel={state?.examinerName ?? content.examiner}
          localLabel="You"
          remotePlaceholder={examinerInitials}
          localPlaceholder={studentInitials}
          remoteFit="contain"
          sideContent={
            showCueCard ? (
              <CueCardController
                content={content}
                phase={phase === "part2-prep" ? "prep" : "speak"}
              />
            ) : undefined
          }
          overlay={
            <div className="absolute left-4 top-4 z-20 w-52 rounded-xl border border-white/10 bg-slate-800/80 p-3 backdrop-blur">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Progress
              </p>
              <SessionProgress content={content} phase={phase} />
            </div>
          }
        />
      </main>

      <footer className="flex shrink-0 items-center justify-between border-t border-slate-200 bg-white px-5 py-2.5">
        <span className="flex items-center gap-2 text-[12px] font-medium text-rose-600">
          <span className="h-2 w-2 animate-pulse rounded-full bg-rose-500" />
          Live video · Do not leave this page
        </span>
        <div className="flex items-center gap-2 text-[12px] text-slate-500">
          {phase === "complete" || submitting ? (
            <span className="flex items-center gap-1.5">
              <Loader2 size={13} className="animate-spin" />
              Finalising session…
            </span>
          ) : (
            <span>{partMeta?.guidance ?? "Examiner controls the session"}</span>
          )}
        </div>
      </footer>
    </>
  );
}

function SessionProgress({
  content,
  phase,
}: {
  content: SpeakingContent;
  phase: SpeakingPhase;
}) {
  const activePart = phaseToPart(phase);

  return (
    <ol className="space-y-1.5">
      {content.parts.map((p) => {
        const state =
          p.part < activePart
            ? "done"
            : p.part === activePart
              ? "active"
              : "pending";
        return (
          <li key={p.part} className="flex items-center gap-2.5">
            {state === "done" ? (
              <CheckCircle2 size={16} className="text-emerald-400" />
            ) : state === "active" ? (
              <CircleDot size={16} className="text-rose-400" />
            ) : (
              <span className="h-4 w-4 rounded-full border-2 border-slate-600" />
            )}
            <span
              className={cn(
                "text-[12px]",
                state === "active"
                  ? "font-semibold text-white"
                  : state === "done"
                    ? "text-slate-400"
                    : "text-slate-500",
              )}
            >
              Part {p.part}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function CueCardController({
  content,
  phase,
}: {
  content: SpeakingContent;
  phase: "prep" | "speak";
}) {
  const card = content.cueCard;
  const seconds = phase === "prep" ? card.prepSeconds : card.speakSeconds;
  const remaining = useCountdown(seconds);

  return (
    <SpeakingCueCard
      title={card.title}
      bullets={card.bullets}
      phase={phase}
      remaining={remaining}
    />
  );
}
