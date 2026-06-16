"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  PhoneOff,
  Radio,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScoringOverlay } from "@/components/teacher/speaking/scoring-overlay";
import {
  LivekitSetupNotice,
  useSpeakingRoom,
} from "@/contexts/speaking-room-context";
import { useTeacherSpeaking } from "@/contexts/teacher-speaking-context";
import {
  SpeakingControlBar,
  SpeakingVideoLayout,
} from "@/components/speaking/speaking-video-layout";
import { emptySpeakingContent } from "@/lib/admin/content/factories";
import {
  buildExaminerParts,
  promptForPhase,
} from "@/lib/speaking/content";
import { formatElapsed, type SpeakingPart } from "@/lib/speaking/scoring";
import { phaseToPart, type SpeakingPhase } from "@/lib/speaking/sync";
import { cn } from "@/lib/utils";

export function SpeakingLiveConsole() {
  const {
    session,
    sessionId,
    speakingContent,
    contentLoading,
    contentError,
  } = useTeacherSpeaking();
  const { phase, setPhase, endSession, state, participantCount, livekitConfigured } =
    useSpeakingRoom();

  const parts = useMemo(
    () => buildExaminerParts(speakingContent ?? emptySpeakingContent()),
    [speakingContent],
  );

  const [activePart, setActivePart] = useState<SpeakingPart>(1);
  const [promptIndex, setPromptIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const current = parts.find((p) => p.part === activePart) ?? parts[0];

  useEffect(() => {
    if (phase === "part1") setActivePart(1);
    if (phase === "part2-prep" || phase === "part2-speak") setActivePart(2);
    if (phase === "part3" || phase === "complete") setActivePart(3);
  }, [phase]);

  useEffect(() => {
    setPromptIndex(0);
  }, [activePart, phase]);

  useEffect(() => {
    timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  if (!session || !sessionId) return null;

  async function selectPart(part: SpeakingPart) {
    setActivePart(part);
    setPromptIndex(0);
    const nextPhase: SpeakingPhase =
      part === 1 ? "part1" : part === 2 ? "part2-prep" : "part3";
    await setPhase(nextPhase);
  }

  async function advancePart2() {
    if (phase === "part2-prep") {
      await setPhase("part2-speak");
    }
  }

  function nextPrompt() {
    if (!current) return;
    const max = current.prompts.length - 1;
    setPromptIndex((i) => Math.min(max, i + 1));
  }

  function prevPrompt() {
    setPromptIndex((i) => Math.max(0, i - 1));
  }

  const displayPrompt = current
    ? promptForPhase(current, promptIndex, phase)
    : "";
  const partNum = phaseToPart(phase);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-slate-950 text-white">
      <header className="flex shrink-0 items-center justify-between border-b border-white/10 bg-slate-900/95 px-4 py-2.5 backdrop-blur">
        <div className="flex items-center gap-3">
          <Link
            href="/teacher/speaking"
            className="rounded-lg px-2 py-1 text-xs text-white/60 hover:bg-white/10 hover:text-white"
          >
            ← Exit
          </Link>
          <div>
            <p className="text-sm font-bold">{session.studentName}</p>
            <p className="text-xs text-white/50">{session.timeRange}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 rounded-full bg-rose-500/20 px-2.5 py-1 text-xs font-semibold text-rose-200">
            <Radio className="h-3 w-3 animate-pulse" />
            Live
          </span>
          <span className="font-mono text-lg font-bold tabular-nums">
            {formatElapsed(elapsed)}
          </span>
          <span className="hidden text-xs text-white/50 sm:inline">
            {participantCount} in room
          </span>
        </div>
      </header>

      <main className="relative min-h-0 flex-1">
        {!livekitConfigured ? (
          <div className="flex h-full items-center justify-center p-8">
            <LivekitSetupNotice />
          </div>
        ) : (
          <>
            <SpeakingVideoLayout
              remoteLabel={session.studentName}
              localLabel="You"
              remotePlaceholder={session.studentInitials}
              localPlaceholder={session.studentInitials.slice(0, 1)}
              className="h-full min-h-[280px]"
              videoWidthRatio={0.6}
              letterboxBlur
              overlay={
                <>
                  <div className="pointer-events-none absolute inset-x-[20%] bottom-0 z-20 bg-gradient-to-t from-black/85 via-black/50 to-transparent px-4 pb-28 pt-16 sm:px-8">
                    {contentLoading ? (
                      <div className="flex items-center gap-2 text-white/70">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Loading examiner prompts…
                      </div>
                    ) : contentError ? (
                      <p className="text-sm text-amber-300">
                        Could not load content bank — using defaults.
                      </p>
                    ) : (
                      <>
                        <p className="text-xs font-bold uppercase tracking-widest text-sky-300">
                          Part {partNum} · {current?.title ?? "Speaking"}
                          {current && current.prompts.length > 1 && activePart !== 2 && (
                            <span className="ml-2 text-white/50">
                              Q{promptIndex + 1}/{current.prompts.length}
                            </span>
                          )}
                        </p>
                        <p className="mt-2 max-w-3xl text-xl font-semibold leading-snug text-white sm:text-2xl lg:text-3xl">
                          {displayPrompt || "Select a part to begin."}
                        </p>
                        {activePart === 2 && current?.cueCard && (
                          <div className="mt-4 max-w-lg rounded-lg border border-amber-400/40 bg-amber-950/60 px-4 py-3">
                            <p className="text-sm font-bold text-amber-100">
                              {current.cueCard.topic}
                            </p>
                            <ul className="mt-1 list-disc pl-5 text-xs text-amber-100/90">
                              {current.cueCard.bullets.map((b) => (
                                <li key={b}>{b}</li>
                              ))}
                            </ul>
                            <p className="mt-2 text-[11px] text-amber-200/70">
                              Cue card is visible to the student during Part 2.
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <ScoringOverlay />
                </>
              }
            />
            <div className="absolute bottom-4 left-4 z-20 hidden sm:block">
              <SpeakingControlBar />
            </div>
          </>
        )}
      </main>

      <footer className="shrink-0 border-t border-white/10 bg-slate-900/95 px-3 py-3 backdrop-blur sm:px-4">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {([1, 2, 3] as SpeakingPart[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => void selectPart(p)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                  activePart === p
                    ? "bg-white text-navy"
                    : "bg-white/10 text-white/80 hover:bg-white/20",
                )}
              >
                Part {p}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {activePart !== 2 && current && current.prompts.length > 1 && (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-8 border-white/20 bg-white/10 text-white hover:bg-white/20"
                  disabled={promptIndex === 0}
                  onClick={prevPrompt}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-8 border-white/20 bg-white/10 text-white hover:bg-white/20"
                  disabled={promptIndex >= current.prompts.length - 1}
                  onClick={nextPrompt}
                >
                  Next question
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </>
            )}

            {activePart === 2 && phase === "part2-prep" && (
              <Button size="sm" onClick={() => void advancePart2()}>
                Start Part 2 speaking
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}

            <Button
              variant="secondary"
              size="sm"
              className="h-8 border-rose-500/30 bg-rose-950/50 text-rose-200 hover:bg-rose-900/60"
              onClick={() => void endSession()}
            >
              <PhoneOff className="h-3.5 w-3.5" />
              End session
            </Button>
          </div>
        </div>
        {state && (
          <p className="mt-2 text-center text-[11px] text-white/40">
            Phase: {state.activePhase}
            {speakingContent?.testId ? ` · ${speakingContent.testId}` : ""}
          </p>
        )}
      </footer>
    </div>
  );
}
