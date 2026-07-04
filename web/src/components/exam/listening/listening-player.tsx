"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ListeningContent } from "@/lib/exam/types";
import { ExamTopBar } from "@/components/exam/shell/exam-top-bar";
import { ExamTimer } from "@/components/exam/shell/exam-timer";
import {
  QuestionPalette,
  type PalettePart,
} from "@/components/exam/shell/question-palette";
import { SubmitDialog } from "@/components/exam/shell/submit-dialog";
import { QuestionGroup } from "@/components/exam/questions/question-group";
import { InstructionScreen } from "@/components/exam/questions/instruction-screen";
import {
  ListeningAudioPlayer,
  type ListeningAudioPlayerHandle,
} from "@/components/exam/listening/listening-audio-player";
import { useExamState, TEXT_SIZE_CLASS } from "@/lib/exam/use-exam-state";
import { EXAM_FONT_STYLE } from "@/lib/exam/typography";
import { CONTRAST_THEMES } from "@/lib/exam/contrast";
import { useExamContrast } from "@/hooks/use-exam-contrast";
import { answeredCount, questionNumbers } from "@/lib/exam/helpers";
import { useInstructionGate } from "@/hooks/use-instruction-gate";
import { useExamContent } from "@/hooks/use-exam-content";
import { useServerTimer } from "@/hooks/use-server-timer";
import { useExamAutosave } from "@/hooks/use-exam-autosave";
import { useExamIntegrity, exitExamFullscreen } from "@/hooks/use-exam-integrity";
import { useExamSectionSync } from "@/hooks/use-exam-section-sync";
import { startSection, submitSection, logIntegrity, getExamSession } from "@/lib/api/exam";
import { examRouteAfterSection, examResumeRoute } from "@/lib/exam/package-skills";
import { cn } from "@/lib/utils";
import { ApiDataShell } from "@/components/shared/api-data-shell";
import { ExamIntegrityWarning } from "@/components/exam/shell/exam-integrity-warning";
import { ExamRemoteNotice } from "@/components/exam/shell/exam-remote-notice";

export function ListeningPlayer({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const audioRef = useRef<ListeningAudioPlayerHandle>(null);
  const { content, loading, error } = useExamContent<ListeningContent>(
    sessionId,
    "listening",
  );
  const [sectionStarted, setSectionStarted] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [audioStatus, setAudioStatus] = useState("Preparing audio…");
  const [audioReadyToStart, setAudioReadyToStart] = useState(false);

  const state = useExamState(content?.parts[0]?.id ?? "part-1");
  const { contrast, setContrast } = useExamContrast(sessionId);
  const contrastTheme = CONTRAST_THEMES[contrast];
  const { remaining, expired } = useServerTimer(sessionId, {
    enabled: sectionStarted,
  });
  const { flushNow } = useExamAutosave(sessionId, state.answers);
  const { warning, dismissWarning } = useExamIntegrity(sessionId);
  const { markLocalSubmit, remoteNotice } = useExamSectionSync(sessionId, "listening", {
    enabled: sectionStarted,
  });

  const logPaste = useCallback(
    () => void logIntegrity(sessionId, "paste_attempt"),
    [sessionId],
  );

  const audioTracks = useMemo(() => {
    if (!content) return [];
    if (content.audioTracks?.length) return content.audioTracks;
    return content.parts
      .filter((p) => p.audioUrl)
      .map((p) => ({ part: p.part, url: p.audioUrl! }));
  }, [content]);

  useEffect(() => {
    if (!content || sectionStarted) return;
    void startSection(sessionId, "listening")
      .then(() => setSectionStarted(true))
      .catch(async () => {
        try {
          const session = await getExamSession(sessionId);
          router.replace(
            examResumeRoute(sessionId, session.state, session.enrollment.package.skills),
          );
        } catch {
          setSectionStarted(true);
        }
      });
  }, [content, sessionId, sectionStarted, router]);

  useEffect(() => {
    if (expired) setSubmitOpen(true);
  }, [expired]);

  const paletteParts: PalettePart[] = useMemo(
    () =>
      content?.parts.map((p) => ({
        id: p.id,
        label: `Part ${p.part}`,
        numbers: questionNumbers(p.groups),
      })) ?? [],
    [content?.parts],
  );

  const allNumbers = useMemo(
    () => paletteParts.flatMap((p) => p.numbers),
    [paletteParts],
  );
  const answered = answeredCount(state.answers, allNumbers);

  const activePart =
    content?.parts.find((p) => p.id === state.activePart) ?? content?.parts[0];

  const { blocking, dismiss, questionGroups, nextQuestionAfter } =
    useInstructionGate(activePart?.groups ?? []);

  const startAudio = useCallback(() => {
    if (!audioTracks.length) return;
    void audioRef.current?.start();
  }, [audioTracks.length]);

  useEffect(() => {
    if (!sectionStarted || !audioReadyToStart) return;
    startAudio();
  }, [sectionStarted, audioReadyToStart, startAudio]);

  useEffect(() => {
    if (!sectionStarted) {
      setAudioReadyToStart(false);
      return;
    }
    if (!blocking) {
      setAudioReadyToStart(true);
    }
  }, [sectionStarted, blocking]);

  const currentIndex =
    state.current != null ? allNumbers.indexOf(state.current) : -1;
  const canGoPrevQuestion = currentIndex > 0;
  const canGoNextQuestion =
    currentIndex >= 0 && currentIndex < allNumbers.length - 1;

  const goToQuestion = useCallback(
    (n: number) => {
      if (!content) return;
      const part = content.parts.find((p) =>
        questionNumbers(p.groups).includes(n),
      );
      if (part && part.id !== state.activePart) state.setActivePart(part.id);
      state.setCurrent(n);
      requestAnimationFrame(() => {
        document
          .getElementById(`q-${n}`)
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    },
    [content, state.activePart, state.setActivePart, state.setCurrent],
  );

  if (loading || !content || !activePart) {
    return <ApiDataShell loading={loading} error={error} />;
  }

  function goPrevQuestion() {
    if (!canGoPrevQuestion) return;
    goToQuestion(allNumbers[currentIndex - 1]!);
  }

  function goNextQuestion() {
    if (!canGoNextQuestion) return;
    goToQuestion(allNumbers[currentIndex + 1]!);
  }

  async function handleSubmit() {
    setSubmitting(true);
    markLocalSubmit();
    try {
      await flushNow();
      const updated = await submitSection(sessionId, "listening");
      const destination = examRouteAfterSection(
        sessionId,
        updated.enrollment.package.skills,
        "listening",
      );
      if (destination === "/mock-day") exitExamFullscreen();
      router.push(destination);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <ExamIntegrityWarning warning={warning} onDismiss={dismissWarning} />
      <ExamRemoteNotice message={remoteNotice} />

      {audioTracks.length > 0 && (
        <ListeningAudioPlayer
          ref={audioRef}
          tracks={audioTracks}
          sessionId={sessionId}
          onStatusChange={setAudioStatus}
        />
      )}

      <ExamTopBar
        testTakerId={sessionId}
        audioStatus={audioStatus}
        timer={<ExamTimer remainingSeconds={remaining} hidden={state.hideTimer} />}
        textSize={state.textSize}
        onTextSize={state.setTextSize}
        hideTimer={state.hideTimer}
        onToggleTimer={state.setHideTimer}
        displayTools={{ contrast, onContrast: setContrast }}
      />

      <div
        className="flex shrink-0 items-center gap-3 border-b px-5 py-2"
        style={{
          ...EXAM_FONT_STYLE,
          backgroundColor: contrastTheme.bar,
          borderColor: contrastTheme.border,
          color: contrastTheme.fg,
        }}
      >
        <div>
          <p className="text-[13px] font-bold">Part {activePart.part}</p>
          <p className="text-[13px] font-normal">{activePart.blurb}</p>
        </div>
      </div>

      <main
        className="relative min-h-0 flex-1 overflow-y-auto"
        data-exam-surface
        style={{
          ...EXAM_FONT_STYLE,
          backgroundColor: contrastTheme.bg,
          color: contrastTheme.fg,
        }}
      >
        <div
          className={`mx-auto max-w-3xl space-y-8 px-5 py-6 ${TEXT_SIZE_CLASS[state.textSize]}`}
        >
          {questionGroups.map((group) => (
            <QuestionGroup
              key={group.id}
              group={group}
              answers={state.answers}
              current={state.current}
              onAnswer={state.setAnswer}
              onFocus={state.focusQuestion}
              onPasteBlocked={logPaste}
            />
          ))}
        </div>

        <div
          className="pointer-events-none sticky bottom-0 flex justify-end gap-0.5 px-5 pb-2 pt-6"
          style={{
            background: `linear-gradient(to top, ${contrastTheme.bg}, ${contrastTheme.bg}f2, transparent)`,
          }}
        >
          <button
            type="button"
            onClick={goPrevQuestion}
            disabled={!canGoPrevQuestion}
            aria-label="Previous question"
            className={cn(
              "pointer-events-auto flex h-8 w-8 items-center justify-center border transition",
              canGoPrevQuestion ? "hover:opacity-90" : "cursor-not-allowed opacity-40",
            )}
            style={{
              borderColor: contrastTheme.border,
              backgroundColor: contrastTheme.bar,
              color: contrastTheme.fg,
            }}
          >
            <ChevronLeft size={16} strokeWidth={2.5} />
          </button>
          <button
            type="button"
            onClick={goNextQuestion}
            disabled={!canGoNextQuestion}
            aria-label="Next question"
            className={cn(
              "pointer-events-auto flex h-8 w-8 items-center justify-center border transition",
              canGoNextQuestion ? "hover:opacity-90" : "cursor-not-allowed opacity-40",
            )}
            style={{
              borderColor: contrastTheme.border,
              backgroundColor:
                contrast === "black-on-white" && canGoNextQuestion
                  ? "#000000"
                  : contrastTheme.bar,
              color:
                contrast === "black-on-white" && canGoNextQuestion
                  ? "#ffffff"
                  : contrastTheme.fg,
            }}
          >
            <ChevronRight size={16} strokeWidth={2.5} />
          </button>
        </div>
      </main>

      {blocking && (
        <InstructionScreen
          group={blocking}
          overlay
          onContinue={() => {
            dismiss(blocking.id);
            setAudioReadyToStart(true);
            startAudio();
            const next = nextQuestionAfter(blocking.id);
            if (next != null) goToQuestion(next);
          }}
        />
      )}

      <QuestionPalette
        parts={paletteParts}
        answers={state.answers}
        activePart={state.activePart}
        current={state.current}
        onSelectPart={state.setActivePart}
        onSelectQuestion={goToQuestion}
        onSubmit={() => setSubmitOpen(true)}
        submitLabel="End Listening"
        theme={contrastTheme}
        layout="segmented"
      />

      <SubmitDialog
        open={submitOpen}
        title="End the Listening section?"
        message="Your answers will be submitted and automatically scored. You cannot return to Listening."
        answered={answered}
        total={content.totalQuestions}
        confirmLabel={submitting ? "Submitting…" : "Submit Listening"}
        onCancel={() => !expired && setSubmitOpen(false)}
        onConfirm={() => void handleSubmit()}
      />
    </>
  );
}
