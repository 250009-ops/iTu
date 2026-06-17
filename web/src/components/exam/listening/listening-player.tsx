"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Headphones } from "lucide-react";
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
import { ListeningAudioPlayer } from "@/components/exam/listening/listening-audio-player";
import { useExamState, TEXT_SIZE_CLASS } from "@/lib/exam/use-exam-state";
import { answeredCount, questionNumbers } from "@/lib/exam/helpers";
import { useInstructionGate } from "@/hooks/use-instruction-gate";
import { useExamContent } from "@/hooks/use-exam-content";
import { useServerTimer } from "@/hooks/use-server-timer";
import { useExamAutosave } from "@/hooks/use-exam-autosave";
import { useExamIntegrity } from "@/hooks/use-exam-integrity";
import { startSection, submitSection, logIntegrity } from "@/lib/api/exam";
import { ApiDataShell } from "@/components/shared/api-data-shell";

export function ListeningPlayer({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const { content, loading, error } = useExamContent<ListeningContent>(
    sessionId,
    "listening",
  );
  const [started, setStarted] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [audioStatus, setAudioStatus] = useState("Preparing audio…");

  const state = useExamState(content?.parts[0]?.id ?? "part-1");
  const { remaining, expired } = useServerTimer(sessionId);
  useExamAutosave(sessionId, state.answers);
  useExamIntegrity(sessionId);

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
    if (!content || started) return;
    void startSection(sessionId, "listening")
      .then(() => setStarted(true))
      .catch(() => setStarted(true));
  }, [content, sessionId, started]);

  useEffect(() => {
    if (expired) setSubmitOpen(true);
  }, [expired]);

  const paletteParts: PalettePart[] = useMemo(
    () =>
      content?.parts.map((p) => ({
        id: p.id,
        label: p.title,
        numbers: questionNumbers(p.groups),
      })) ?? [],
    [content?.parts],
  );

  const allNumbers = useMemo(
    () => paletteParts.flatMap((p) => p.numbers),
    [paletteParts],
  );
  const answered = answeredCount(state.answers, allNumbers);

  if (loading || !content) {
    return <ApiDataShell loading={loading} error={error} />;
  }

  const activePart =
    content.parts.find((p) => p.id === state.activePart) ?? content.parts[0];

  const { blocking, dismiss, questionGroups, nextQuestionAfter } =
    useInstructionGate(activePart.groups);

  const goToQuestion = (n: number) => {
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
  };

  async function handleSubmit() {
    setSubmitting(true);
    try {
      await submitSection(sessionId, "listening");
      router.push(`/exam/${sessionId}/break?from=listening&next=reading`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {audioTracks.length > 0 && (
        <ListeningAudioPlayer
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
      />

      <div className="flex shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-5 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
          <Headphones size={16} />
        </div>
        <div>
          <p className="text-[14px] font-bold text-navy">{activePart.title}</p>
          <p className="text-[13px] text-slate-500">{activePart.blurb}</p>
        </div>
      </div>

      <main className="min-h-0 flex-1 overflow-y-auto bg-slate-50" data-exam-surface>
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
      </main>

      {blocking && (
        <InstructionScreen
          group={blocking}
          overlay
          onContinue={() => {
            dismiss(blocking.id);
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
