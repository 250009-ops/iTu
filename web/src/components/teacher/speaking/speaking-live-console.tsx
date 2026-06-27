"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  PhoneOff,
  Radio,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ScoringSidebar } from "@/components/teacher/speaking/scoring-overlay";
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
import { useCountdown } from "@/lib/exam/use-countdown";
import { formatClock } from "@/lib/exam/helpers";
import { playPrepEndBell } from "@/lib/speaking/prep-bell";
import { formatElapsed, type SpeakingPart } from "@/lib/speaking/scoring";
import { phaseToPart, type SpeakingPhase } from "@/lib/speaking/sync";
import { getErrorMessage } from "@/lib/api/errors";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

export function SpeakingLiveConsole() {
  const router = useRouter();
  const { toast } = useToast();
  const {
    session,
    sessionId,
    speakingContent,
    contentLoading,
    contentError,
    refreshSession,
    refreshHub,
  } = useTeacherSpeaking();
  const {
    phase,
    setPhase,
    endSession,
    leaveRoom,
    publishSync,
    state,
    participantCount,
    livekitConfigured,
  } = useSpeakingRoom();

  const parts = useMemo(
    () => buildExaminerParts(speakingContent ?? emptySpeakingContent()),
    [speakingContent],
  );

  const [activePart, setActivePart] = useState<SpeakingPart>(1);
  const [promptIndex, setPromptIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [exiting, setExiting] = useState(false);
  const [ending, setEnding] = useState(false);
  const [endConfirmOpen, setEndConfirmOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const current = parts.find((p) => p.part === activePart) ?? parts[0];
  const sessionEnded = phase === "complete" || state?.status === "completed";

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

  useEffect(() => {
    if (!sessionEnded || !timerRef.current) return;
    clearInterval(timerRef.current);
    timerRef.current = null;
  }, [sessionEnded]);

  const prepSeconds =
    speakingContent?.cueCard?.prepSeconds ??
    emptySpeakingContent().cueCard.prepSeconds;

  if (!session || !sessionId) return null;

  function prepUrl() {
    return `/teacher/speaking?session=${sessionId}`;
  }

  async function handleExit() {
    if (exiting || ending) return;
    setExiting(true);
    try {
      await leaveRoom();
      router.push(prepUrl());
    } catch (err) {
      toast("Could not leave live console", {
        description: getErrorMessage(err, "Please try again."),
        variant: "error",
      });
    } finally {
      setExiting(false);
    }
  }

  async function handleEndSession() {
    if (!session || sessionEnded || ending || exiting) return;
    const studentName = session.studentName;
    setEndConfirmOpen(false);
    setEnding(true);
    try {
      await endSession();
      await leaveRoom();
      await refreshSession();
      await refreshHub();
      router.push(prepUrl());
      toast("Speaking session ended", {
        description: `${studentName} can now finish their exam flow.`,
        variant: "success",
      });
    } catch (err) {
      toast("Could not end session", {
        description: getErrorMessage(err, "Please try again."),
        variant: "error",
      });
    } finally {
      setEnding(false);
    }
  }

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
          <button
            type="button"
            onClick={() => void handleExit()}
            disabled={exiting || ending}
            className="rounded-lg px-2 py-1 text-xs text-white/60 hover:bg-white/10 hover:text-white disabled:opacity-50"
          >
            {exiting ? "Leaving…" : "← Exit"}
          </button>
          <div>
            <p className="text-sm font-bold">{session.studentName}</p>
            <p className="text-xs text-white/50">{session.timeRange}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 rounded-full bg-rose-500/20 px-2.5 py-1 text-xs font-semibold text-rose-200">
            <Radio className="h-3 w-3 animate-pulse" />
            {sessionEnded ? "Ended" : "Live"}
          </span>
          <span className="font-mono text-lg font-bold tabular-nums">
            {formatElapsed(elapsed)}
          </span>
          <span className="hidden text-xs text-white/50 sm:inline">
            {participantCount} in room
          </span>
        </div>
      </header>

      <main className="flex min-h-0 flex-1">
        {!livekitConfigured ? (
          <div className="flex flex-1 items-center justify-center p-8">
            <LivekitSetupNotice />
          </div>
        ) : (
          <>
            <div className="relative min-w-0 basis-[70%]">
              <SpeakingVideoLayout
                remoteLabel={session.studentName}
                localLabel="You"
                remotePlaceholder={session.studentInitials}
                localPlaceholder={session.studentInitials.slice(0, 1)}
                className="h-full min-h-[280px]"
                overlay={
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/85 via-black/50 to-transparent px-4 pb-28 pt-16 sm:px-8">
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
                }
              />
              <div className="absolute bottom-4 left-4 z-20 hidden sm:block">
                <SpeakingControlBar />
              </div>
            </div>

            <div className="min-w-0 basis-[30%]">
              <ScoringSidebar />
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
              <>
                <ExaminerPart2PrepTimer
                  key={`part2-prep-${prepSeconds}`}
                  prepSeconds={prepSeconds}
                  onPrepEnd={() => void publishSync({ type: "prep-end" })}
                />
                <Button size="sm" onClick={() => void advancePart2()}>
                  Start Part 2 speaking
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </>
            )}

            <Button
              variant="secondary"
              size="sm"
              className="h-8 border-rose-500/30 bg-rose-950/50 text-rose-200 hover:bg-rose-900/60"
              disabled={sessionEnded || ending || exiting}
              loading={ending}
              onClick={() => setEndConfirmOpen(true)}
            >
              <PhoneOff className="h-3.5 w-3.5" />
              {sessionEnded ? "Session ended" : "End session"}
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

      <ConfirmDialog
        open={endConfirmOpen}
        title="End speaking session?"
        message={`This will disconnect the live call and mark ${session.studentName}'s speaking session as complete. The student will be able to finish their exam.`}
        confirmLabel="End session"
        tone="danger"
        onConfirm={() => void handleEndSession()}
        onCancel={() => setEndConfirmOpen(false)}
      />
    </div>
  );
}

function ExaminerPart2PrepTimer({
  prepSeconds,
  onPrepEnd,
}: {
  prepSeconds: number;
  onPrepEnd: () => void;
}) {
  const endedRef = useRef(false);
  const remaining = useCountdown(prepSeconds, () => {
    if (endedRef.current) return;
    endedRef.current = true;
    playPrepEndBell();
    onPrepEnd();
  });

  return (
    <span
      className={cn(
        "rounded-lg px-3 py-1.5 text-xs font-bold tabular-nums",
        remaining <= 0
          ? "bg-rose-500/30 text-rose-100"
          : "bg-amber-500/20 text-amber-100",
      )}
    >
      Prep {formatClock(remaining)}
      {remaining <= 0 ? " · Start speaking" : ""}
    </span>
  );
}
