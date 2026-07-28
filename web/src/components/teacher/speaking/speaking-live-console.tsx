"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
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
import { useExaminerPaths } from "@/hooks/use-examiner-paths";
import {
  SpeakingControlBar,
  SpeakingVideoLayout,
} from "@/components/speaking/speaking-video-layout";
import { emptySpeakingContent } from "@/lib/admin/content/factories";
import {
  buildExaminerParts,
  partUsesTopics,
  promptForPhase,
} from "@/lib/speaking/content";
import { formatClock } from "@/lib/exam/helpers";
import { playPrepEndBell } from "@/lib/speaking/prep-bell";
import { formatElapsed, type SpeakingPart } from "@/lib/speaking/scoring";
import { phaseToPart, resolvePart2ReentryPhase, type SpeakingPhase } from "@/lib/speaking/sync";
import { usePart2Countdown } from "@/hooks/use-part2-countdown";
import { useSpeakingSlotDeadline } from "@/hooks/use-speaking-slot-deadline";
import { getErrorMessage } from "@/lib/api/errors";
import { getTeacherSpeakingSessions } from "@/lib/api/teachers";
import { mapTeacherSpeakingSessions } from "@/lib/api/mappers/teacher";
import { pickNextSpeakingSession } from "@/lib/speaking/session-queue";
import { useToast } from "@/components/ui/toast";
import { EXAMINER_INTEGRITY_ALERTS } from "@/hooks/use-speaking-integrity";
import { useAuth, getInitials } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

export function SpeakingLiveConsole() {
  const router = useRouter();
  const { toast } = useToast();
  const { session: authSession } = useAuth();
  const examinerInitials = getInitials(authSession?.name ?? "Examiner");
  const { speaking } = useExaminerPaths();
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
    studentIntegrityAlert,
    clearStudentIntegrityAlert,
    part2PrepStartedAt,
    part2SpeakStartedAt,
  } = useSpeakingRoom();

  const parts = useMemo(
    () => buildExaminerParts(speakingContent ?? emptySpeakingContent()),
    [speakingContent],
  );

  const [activePart, setActivePart] = useState<SpeakingPart>(1);
  const [topicIndex, setTopicIndex] = useState(0);
  const [promptIndex, setPromptIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [exiting, setExiting] = useState(false);
  const [ending, setEnding] = useState(false);
  const [endConfirmOpen, setEndConfirmOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const finishingRef = useRef(false);

  const scheduledAt =
    state?.scheduledAt ?? session?.scheduledAt ?? null;
  const sessionEnded = phase === "complete" || state?.status === "completed";

  const finishSession = useCallback(
    async (autoAdvance: boolean) => {
      if (
        !session ||
        !sessionId ||
        sessionEnded ||
        ending ||
        exiting ||
        finishingRef.current
      ) {
        return;
      }
      finishingRef.current = true;
      setEnding(true);
      const studentName = session.studentName;
      const currentScheduledAt = scheduledAt;
      try {
        await endSession();
        await leaveRoom();
        await refreshSession();
        await refreshHub();

        if (autoAdvance) {
          const raw = await getTeacherSpeakingSessions();
          const hub = mapTeacherSpeakingSessions(raw);
          const next = pickNextSpeakingSession(
            hub,
            sessionId,
            currentScheduledAt,
          );
          if (next) {
            toast("Starting next session", {
              description: `${next.studentName} · ${next.timeRange}`,
              variant: "success",
            });
            router.push(speaking(next.id, { live: true }));
            return;
          }
          toast("Session time ended", {
            description: "No more queued speaking sessions right now.",
            variant: "success",
          });
        } else {
          toast("Speaking session ended", {
            description: `${studentName} can now finish their exam flow.`,
            variant: "success",
          });
        }
        router.push(speaking(sessionId ?? undefined));
      } catch (err) {
        toast("Could not end session", {
          description: getErrorMessage(err, "Please try again."),
          variant: "error",
        });
      } finally {
        finishingRef.current = false;
        setEnding(false);
      }
    },
    [
      session,
      sessionId,
      sessionEnded,
      ending,
      exiting,
      scheduledAt,
      endSession,
      leaveRoom,
      refreshSession,
      refreshHub,
      router,
      toast,
    ],
  );

  const slotRemainingSec = useSpeakingSlotDeadline(
    scheduledAt,
    !sessionEnded && livekitConfigured,
    () => {
      toast("1 minute remaining", {
        description: `Wrap up ${session?.studentName ?? "the student"}'s speaking session.`,
        variant: "error",
      });
    },
    () => {
      void finishSession(true);
    },
  );

  const current = parts.find((p) => p.part === activePart) ?? parts[0];

  useEffect(() => {
    if (phase === "part1") setActivePart(1);
    if (phase === "part2-prep" || phase === "part2-speak") setActivePart(2);
    if (phase === "part3" || phase === "complete") setActivePart(3);
  }, [phase]);

  useEffect(() => {
    setPromptIndex(0);
    setTopicIndex(0);
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

  useEffect(() => {
    if (!studentIntegrityAlert) return;
    toast("Student integrity alert", {
      description: EXAMINER_INTEGRITY_ALERTS[studentIntegrityAlert],
      variant: "error",
    });
    clearStudentIntegrityAlert();
  }, [studentIntegrityAlert, clearStudentIntegrityAlert, toast]);

  const prepSeconds =
    speakingContent?.cueCard?.prepSeconds ??
    emptySpeakingContent().cueCard.prepSeconds;

  if (!session || !sessionId) return null;

  function prepUrl() {
    return speaking(sessionId ?? undefined);
  }

  async function handleExit() {
    if (exiting || ending) return;
    setExiting(true);
    try {
      if (!sessionEnded) {
        await publishSync({ type: "examiner-left" });
      }
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
    setEndConfirmOpen(false);
    await finishSession(false);
  }

  async function selectPart(part: SpeakingPart) {
    setActivePart(part);
    setTopicIndex(0);
    setPromptIndex(0);
    let nextPhase: SpeakingPhase;
    if (part === 1) {
      nextPhase = "part1";
    } else if (part === 3) {
      nextPhase = "part3";
    } else {
      nextPhase = resolvePart2ReentryPhase(
        phase,
        part2SpeakStartedAt !== null,
        part2PrepStartedAt !== null,
      );
    }
    if (nextPhase !== phase) {
      await setPhase(nextPhase);
    }
  }

  async function advancePart2() {
    if (phase === "part2-prep") {
      await setPhase("part2-speak");
    }
  }

  function nextPrompt() {
    if (!current) return;
    if (partUsesTopics(current)) {
      const topic = current.topics![topicIndex];
      if (!topic) return;
      if (promptIndex < topic.questions.length - 1) {
        setPromptIndex((i) => i + 1);
        return;
      }
      if (topicIndex < current.topics!.length - 1) {
        setTopicIndex((i) => i + 1);
        setPromptIndex(0);
      }
      return;
    }
    const max = current.prompts.length - 1;
    setPromptIndex((i) => Math.min(max, i + 1));
  }

  function prevPrompt() {
    if (!current) return;
    if (partUsesTopics(current)) {
      if (promptIndex > 0) {
        setPromptIndex((i) => i - 1);
        return;
      }
      if (topicIndex > 0) {
        const prevTopic = current.topics![topicIndex - 1];
        setTopicIndex((i) => i - 1);
        setPromptIndex(Math.max(0, (prevTopic?.questions.length ?? 1) - 1));
      }
      return;
    }
    setPromptIndex((i) => Math.max(0, i - 1));
  }

  const activeTopics = partUsesTopics(current) ? current!.topics! : [];
  const activeTopic = activeTopics[topicIndex];
  const activeQuestionTotal =
    activeTopic?.questions.length ?? current?.prompts.length ?? 0;
  const canNextPrompt =
    current &&
    (partUsesTopics(current)
      ? promptIndex < activeQuestionTotal - 1 ||
        topicIndex < activeTopics.length - 1
      : promptIndex < current.prompts.length - 1);
  const canPrevPrompt =
    current &&
    (partUsesTopics(current)
      ? promptIndex > 0 || topicIndex > 0
      : promptIndex > 0);

  const displayPrompt = current
    ? promptForPhase(current, promptIndex, phase, topicIndex)
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
          {slotRemainingSec != null && !sessionEnded && (
            <span
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums",
                slotRemainingSec <= 60
                  ? "bg-amber-500/25 text-amber-100"
                  : "bg-white/10 text-white/70",
              )}
            >
              Slot {formatClock(slotRemainingSec)}
            </span>
          )}
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
                localPlaceholder={examinerInitials}
                className="h-full min-h-[280px]"
                overlay={
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/90 via-black/65 to-transparent px-4 pb-28 pt-20 sm:px-8">
                    {contentLoading ? (
                      <div className="flex items-center gap-2 text-white/70">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Loading examiner prompts…
                      </div>
                    ) : contentError ? (
                      <p className="text-sm text-amber-300 [text-shadow:0_1px_8px_rgba(0,0,0,0.85)]">
                        Could not load content bank — using defaults.
                      </p>
                    ) : (
                      <div className="max-w-3xl rounded-xl bg-black/45 px-4 py-3 backdrop-blur-sm sm:px-5 sm:py-4">
                        <p className="text-xs font-bold uppercase tracking-widest text-sky-300 [text-shadow:0_1px_6px_rgba(0,0,0,0.9)]">
                          Part {partNum} · {current?.title ?? "Speaking"}
                          {activeTopic?.title && activePart !== 2 && (
                            <span className="ml-2 text-white/70">
                              · {activeTopic.title}
                            </span>
                          )}
                          {current &&
                            activeQuestionTotal > 1 &&
                            activePart !== 2 && (
                            <span className="ml-2 text-white/50">
                              Q{promptIndex + 1}/{activeQuestionTotal}
                            </span>
                          )}
                        </p>
                        <p className="mt-2 text-xl font-semibold leading-snug text-white [text-shadow:0_2px_12px_rgba(0,0,0,0.95),0_1px_3px_rgba(0,0,0,0.85)] sm:text-2xl lg:text-3xl">
                          {displayPrompt || "Select a part to begin."}
                        </p>
                        {activePart === 2 && current?.cueCard && (
                          <div className="mt-4 max-w-lg rounded-lg border border-amber-400/40 bg-amber-950/70 px-4 py-3 backdrop-blur-sm">
                            <p className="text-sm font-bold text-amber-100 [text-shadow:0_1px_6px_rgba(0,0,0,0.8)]">
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
                      </div>
                    )}
                  </div>
                }
              />
              <div className="absolute bottom-4 left-4 z-20">
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
            {activePart !== 2 && activeTopics.length > 1 && (
              <div className="flex flex-wrap gap-1">
                {activeTopics.map((topic, idx) => (
                  <button
                    key={`${topic.title}-${idx}`}
                    type="button"
                    onClick={() => {
                      setTopicIndex(idx);
                      setPromptIndex(0);
                    }}
                    className={cn(
                      "rounded-lg px-2.5 py-1 text-[11px] font-semibold transition",
                      topicIndex === idx
                        ? activePart === 3
                          ? "bg-violet-500 text-white"
                          : "bg-sky-500 text-white"
                        : "bg-white/10 text-white/75 hover:bg-white/20",
                    )}
                  >
                    {topic.title || `Topic ${idx + 1}`}
                  </button>
                ))}
              </div>
            )}

            {activePart !== 2 && current && activeQuestionTotal > 1 && (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-8 border-white/20 bg-white/10 text-white hover:bg-white/20"
                  disabled={!canPrevPrompt}
                  onClick={prevPrompt}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-8 border-white/20 bg-white/10 text-white hover:bg-white/20"
                  disabled={!canNextPrompt}
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
  const { part2PrepStartedAt } = useSpeakingRoom();
  const remaining = usePart2Countdown(
    part2PrepStartedAt,
    prepSeconds,
    true,
    () => {
      playPrepEndBell();
      onPrepEnd();
    },
  );

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
