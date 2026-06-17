"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, GripVertical } from "lucide-react";
import type { ReadingContent } from "@/lib/exam/types";
import { ExamTopBar } from "@/components/exam/shell/exam-top-bar";
import { ExamTimer } from "@/components/exam/shell/exam-timer";
import {
  QuestionPalette,
  type PalettePart,
} from "@/components/exam/shell/question-palette";
import { SubmitDialog } from "@/components/exam/shell/submit-dialog";
import { QuestionGroup } from "@/components/exam/questions/question-group";
import { ReadingHeadingsProvider } from "@/components/exam/reading/reading-headings-context";
import { PassageWithHeadingZones } from "@/components/exam/reading/passage-with-heading-zones";
import { InstructionScreen } from "@/components/exam/questions/instruction-screen";
import { useExamState, TEXT_SIZE_CLASS } from "@/lib/exam/use-exam-state";
import { answeredCount, questionNumbers } from "@/lib/exam/helpers";
import { matchingHeadingsForPassage } from "@/lib/exam/matching-headings";
import { useInstructionGate } from "@/hooks/use-instruction-gate";
import { isHtmlContent, sanitizePassageHtml } from "@/lib/admin/content/sanitize-html";
import { useExamContent } from "@/hooks/use-exam-content";
import { useServerTimer } from "@/hooks/use-server-timer";
import { useExamAutosave } from "@/hooks/use-exam-autosave";
import { useExamIntegrity } from "@/hooks/use-exam-integrity";
import { startSection, submitSection, logIntegrity } from "@/lib/api/exam";
import { ApiDataShell } from "@/components/shared/api-data-shell";

export function ReadingPlayer({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const { content, loading, error } = useExamContent<ReadingContent>(
    sessionId,
    "reading",
  );
  const [started, setStarted] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [leftPct, setLeftPct] = useState(48);
  const draggingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const state = useExamState(content?.passages[0]?.id ?? "passage-1");
  const { remaining, expired } = useServerTimer(sessionId);
  useExamAutosave(sessionId, state.answers);
  useExamIntegrity(sessionId);

  const logPaste = useCallback(
    () => void logIntegrity(sessionId, "paste_attempt"),
    [sessionId],
  );

  useEffect(() => {
    if (!content || started) return;
    void startSection(sessionId, "reading")
      .then(() => setStarted(true))
      .catch(() => setStarted(true));
  }, [content, sessionId, started]);

  useEffect(() => {
    if (expired) setSubmitOpen(true);
  }, [expired]);

  const paletteParts: PalettePart[] = useMemo(
    () =>
      content?.passages.map((p) => ({
        id: p.id,
        label: `Part ${p.part}`,
        numbers: questionNumbers(p.groups),
      })) ?? [],
    [content?.passages],
  );

  const allNumbers = useMemo(
    () => paletteParts.flatMap((p) => p.numbers),
    [paletteParts],
  );
  const answered = answeredCount(state.answers, allNumbers);

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!draggingRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pct = ((e.clientX - rect.left) / rect.width) * 100;
    setLeftPct(Math.min(72, Math.max(28, pct)));
  }, []);

  const stopDrag = useCallback(() => {
    draggingRef.current = false;
    document.body.style.userSelect = "";
    document.body.style.cursor = "";
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", stopDrag);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", stopDrag);
    };
  }, [onMouseMove, stopDrag]);

  if (loading || !content) {
    return <ApiDataShell loading={loading} error={error} />;
  }

  const activePassage =
    content.passages.find((p) => p.id === state.activePart) ??
    content.passages[0];

  const hasMatchingHeadings =
    matchingHeadingsForPassage(activePassage.groups).length > 0;

  const { blocking, dismiss, questionGroups, nextQuestionAfter } =
    useInstructionGate(activePassage.groups);

  const goToQuestion = (n: number) => {
    const passage = content.passages.find((p) =>
      questionNumbers(p.groups).includes(n),
    );
    if (passage && passage.id !== state.activePart)
      state.setActivePart(passage.id);
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
      await submitSection(sessionId, "reading");
      router.push(`/exam/${sessionId}/break?from=reading&next=writing`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ReadingHeadingsProvider>
      <ExamTopBar
        testTakerId={sessionId}
        timer={<ExamTimer remainingSeconds={remaining} hidden={state.hideTimer} />}
        textSize={state.textSize}
        onTextSize={state.setTextSize}
        hideTimer={state.hideTimer}
        onToggleTimer={state.setHideTimer}
      />

      <div className="flex shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-5 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
          <BookOpen size={16} />
        </div>
        <div>
          <p className="text-[14px] font-bold text-navy">Part {activePassage.part}</p>
          <p className="text-[13px] text-slate-500">{activePassage.blurb}</p>
        </div>
      </div>

      <div ref={containerRef} className="flex min-h-0 flex-1 overflow-hidden">
        <div
          className="min-h-0 overflow-y-auto bg-white px-6 py-6"
          style={{ width: `${leftPct}%` }}
        >
          {hasMatchingHeadings ? (
            <PassageWithHeadingZones
              passage={activePassage}
              groups={activePassage.groups}
              answers={state.answers}
              current={state.current}
              textSizeClass={TEXT_SIZE_CLASS[state.textSize]}
              onAnswer={state.setAnswer}
              onFocus={state.focusQuestion}
            />
          ) : (
            <div
              className={`mx-auto max-w-prose ${TEXT_SIZE_CLASS[state.textSize]}`}
              style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
            >
              <h2 className="mb-2 text-center text-xl font-bold text-navy">
                {activePassage.title}
              </h2>
              {activePassage.subtitle?.trim() && (
                <p className="mb-5 text-center text-[15px] italic leading-snug text-slate-600">
                  {activePassage.subtitle}
                </p>
              )}
              {!activePassage.subtitle?.trim() && <div className="mb-4" />}
              <div className="space-y-4 leading-7 text-slate-700">
                {activePassage.paragraphs.map((para, i) => (
                  <p key={i}>
                    {para.marker && (
                      <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-md bg-slate-100 align-text-bottom text-[12px] font-bold text-navy">
                        {para.marker}
                      </span>
                    )}
                    {isHtmlContent(para.text) ? (
                      <span
                        dangerouslySetInnerHTML={{
                          __html: sanitizePassageHtml(para.text),
                        }}
                      />
                    ) : (
                      para.text
                    )}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>

        <div
          onMouseDown={() => {
            draggingRef.current = true;
            document.body.style.userSelect = "none";
            document.body.style.cursor = "col-resize";
          }}
          className="group relative flex w-2 shrink-0 cursor-col-resize items-center justify-center bg-slate-200 hover:bg-navy/30"
        >
          <div className="flex h-12 w-4 items-center justify-center rounded-full border border-slate-300 bg-white shadow-sm group-hover:border-navy">
            <GripVertical size={14} className="text-slate-400 group-hover:text-navy" />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50 px-6 py-6" data-exam-surface>
          <div className={`space-y-8 ${TEXT_SIZE_CLASS[state.textSize]}`}>
            {questionGroups.map((group) => (
              <QuestionGroup
                key={group.id}
                group={group}
                answers={state.answers}
                current={state.current}
                onAnswer={state.setAnswer}
                onFocus={state.focusQuestion}
                onPasteBlocked={logPaste}
                passageParagraphs={activePassage.paragraphs}
              />
            ))}
          </div>
        </div>
      </div>

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
        submitLabel="End Reading"
      />

      <SubmitDialog
        open={submitOpen}
        title="End the Reading section?"
        message="Your answers will be submitted and automatically scored. You cannot return to Reading."
        answered={answered}
        total={content.totalQuestions}
        confirmLabel={submitting ? "Submitting…" : "Submit Reading"}
        onCancel={() => !expired && setSubmitOpen(false)}
        onConfirm={() => void handleSubmit()}
      />
    </ReadingHeadingsProvider>
  );
}
