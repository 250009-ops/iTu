"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, GripVertical } from "lucide-react";
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
import { SelectablePassage } from "@/components/exam/reading/selectable-passage";
import { PassageSelectionToolbar } from "@/components/exam/reading/passage-selection-toolbar";
import { ReadingNotesPanel } from "@/components/exam/reading/reading-notes-panel";
import { InstructionScreen } from "@/components/exam/questions/instruction-screen";
import { useExamState, TEXT_SIZE_CLASS } from "@/lib/exam/use-exam-state";
import { EXAM_FONT_STYLE } from "@/lib/exam/typography";
import { CONTRAST_THEMES } from "@/lib/exam/contrast";
import { getPassageSelection, type PendingSelection } from "@/lib/exam/reading-marks";
import { useReadingExamTools } from "@/hooks/use-reading-exam-tools";
import { answeredCount, questionNumbers } from "@/lib/exam/helpers";
import { matchingHeadingsForPassage } from "@/lib/exam/matching-headings";
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
  const readingTools = useReadingExamTools(sessionId);
  const {
    marks,
    contrast,
    setContrast,
    notesOpen,
    setNotesOpen,
    activeNoteId,
    setActiveNoteId,
    addHighlight,
    addNote,
    updateNoteText,
    deleteMark,
    openNote,
    toggleNotes,
  } = readingTools;
  const passagePaneRef = useRef<HTMLDivElement>(null);
  const [pendingSelection, setPendingSelection] =
    useState<PendingSelection | null>(null);
  const contrastTheme = CONTRAST_THEMES[contrast];
  const noteCount = marks.filter((m) => m.kind === "note").length;
  const { remaining, expired } = useServerTimer(sessionId, { enabled: started });
  const { flushNow } = useExamAutosave(sessionId, state.answers);
  const { warning, dismissWarning } = useExamIntegrity(sessionId);
  const { markLocalSubmit, remoteNotice } = useExamSectionSync(sessionId, "reading", {
    enabled: started,
  });

  const logPaste = useCallback(
    () => void logIntegrity(sessionId, "paste_attempt"),
    [sessionId],
  );

  useEffect(() => {
    if (!content || started) return;
    void startSection(sessionId, "reading")
      .then(() => setStarted(true))
      .catch(async () => {
        try {
          const session = await getExamSession(sessionId);
          router.replace(
            examResumeRoute(sessionId, session.state, session.enrollment.package.skills),
          );
        } catch {
          setStarted(true);
        }
      });
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

  const activePassage =
    content?.passages.find((p) => p.id === state.activePart) ??
    content?.passages[0];

  // Hooks must run on every render, before any early return, or React throws
  // "rendered fewer hooks than expected" (#310) once content finishes loading.
  const { blocking, dismiss, questionGroups, nextQuestionAfter } =
    useInstructionGate(activePassage?.groups ?? []);

  const activePassageId = activePassage?.id ?? "";

  const handlePassageMouseUp = useCallback(() => {
    const container = passagePaneRef.current;
    if (!container || !activePassageId) return;
    setPendingSelection(getPassageSelection(container, activePassageId));
  }, [activePassageId]);

  const dismissSelection = useCallback(() => {
    setPendingSelection(null);
    window.getSelection()?.removeAllRanges();
  }, []);

  const handleMarkClick = useCallback(
    (id: string) => {
      const mark = marks.find((m) => m.id === id);
      if (mark?.kind === "note") openNote(id);
    },
    [marks, openNote],
  );

  if (loading || !content || !activePassage) {
    return <ApiDataShell loading={loading} error={error} />;
  }

  const hasMatchingHeadings =
    matchingHeadingsForPassage(activePassage.groups).length > 0;

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

  const currentPassageIndex = content.passages.findIndex(
    (p) => p.id === state.activePart,
  );
  const canGoPrevPassage = currentPassageIndex > 0;
  const canGoNextPassage =
    currentPassageIndex >= 0 &&
    currentPassageIndex < content.passages.length - 1;

  function goToPassage(passageIndex: number) {
    if (!content) return;
    const passage = content.passages[passageIndex];
    if (!passage) return;
    state.setActivePart(passage.id);
    const first = questionNumbers(passage.groups)[0];
    if (first != null) {
      state.setCurrent(first);
      requestAnimationFrame(() => {
        document
          .getElementById(`q-${first}`)
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    }
  }

  function goPrevPassage() {
    if (!canGoPrevPassage) return;
    goToPassage(currentPassageIndex - 1);
  }

  function goNextPassage() {
    if (!canGoNextPassage) return;
    goToPassage(currentPassageIndex + 1);
  }

  async function handleSubmit() {
    setSubmitting(true);
    markLocalSubmit();
    try {
      await flushNow();
      const updated = await submitSection(sessionId, "reading");
      const destination = examRouteAfterSection(
        sessionId,
        updated.enrollment.package.skills,
        "reading",
      );
      if (destination === "/mock-day") exitExamFullscreen();
      router.push(destination);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ReadingHeadingsProvider>
      <ExamIntegrityWarning warning={warning} onDismiss={dismissWarning} />
      <ExamRemoteNotice message={remoteNotice} />

      <ExamTopBar
        testTakerId={sessionId}
        timer={<ExamTimer remainingSeconds={remaining} hidden={state.hideTimer} />}
        textSize={state.textSize}
        onTextSize={state.setTextSize}
        hideTimer={state.hideTimer}
        onToggleTimer={state.setHideTimer}
        displayTools={{
          contrast,
          onContrast: setContrast,
          notes: {
            open: notesOpen,
            onToggle: toggleNotes,
            count: noteCount,
          },
        }}
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
          <p className="text-[13px] font-bold">Part {activePassage.part}</p>
          <p className="text-[13px] font-normal">{activePassage.blurb}</p>
        </div>
      </div>

      <div ref={containerRef} className="flex min-h-0 flex-1 overflow-hidden">
        <div
          ref={passagePaneRef}
          onMouseUp={handlePassageMouseUp}
          className="min-h-0 overflow-y-auto px-6 py-6"
          style={{
            width: `${leftPct}%`,
            backgroundColor: contrastTheme.bg,
            color: contrastTheme.fg,
          }}
        >
          {hasMatchingHeadings ? (
            <PassageWithHeadingZones
              passage={activePassage}
              groups={activePassage.groups}
              answers={state.answers}
              current={state.current}
              textSizeClass={TEXT_SIZE_CLASS[state.textSize]}
              marks={marks}
              fgColor={contrastTheme.fg}
              onMarkClick={handleMarkClick}
              onAnswer={state.setAnswer}
              onFocus={state.focusQuestion}
            />
          ) : (
            <SelectablePassage
              passage={activePassage}
              marks={marks}
              textSizeClass={TEXT_SIZE_CLASS[state.textSize]}
              fgColor={contrastTheme.fg}
              onMarkClick={handleMarkClick}
            />
          )}
        </div>

        {pendingSelection && (
          <PassageSelectionToolbar
            selection={pendingSelection}
            onHighlight={() => {
              addHighlight(pendingSelection);
              dismissSelection();
            }}
            onNote={() => {
              addNote(pendingSelection);
              dismissSelection();
            }}
            onDismiss={dismissSelection}
          />
        )}

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

        <div
          className="relative min-h-0 flex-1 overflow-hidden"
          style={{ backgroundColor: contrastTheme.bg }}
        >
          <div
            className="relative h-full min-h-0 overflow-y-auto px-6 py-6"
            data-exam-surface
            style={{
              ...EXAM_FONT_STYLE,
              backgroundColor: contrastTheme.bg,
              color: contrastTheme.fg,
              marginRight: notesOpen ? "20rem" : undefined,
            }}
          >
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

            <div
              className="pointer-events-none sticky bottom-0 flex justify-end gap-0.5 pb-1 pt-6"
              style={{
                background: `linear-gradient(to top, ${contrastTheme.bg}, ${contrastTheme.bg}f2, transparent)`,
              }}
            >
              <button
                type="button"
                onClick={goPrevPassage}
                disabled={!canGoPrevPassage}
                aria-label="Previous passage"
                className={cn(
                  "pointer-events-auto flex h-8 w-8 items-center justify-center border transition",
                  canGoPrevPassage
                    ? "hover:opacity-90"
                    : "cursor-not-allowed opacity-40",
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
                onClick={goNextPassage}
                disabled={!canGoNextPassage}
                aria-label="Next passage"
                className={cn(
                  "pointer-events-auto flex h-8 w-8 items-center justify-center border transition",
                  canGoNextPassage
                    ? "hover:opacity-90"
                    : "cursor-not-allowed opacity-40",
                )}
                style={{
                  borderColor: contrastTheme.border,
                  backgroundColor:
                    contrast === "black-on-white" && canGoNextPassage
                      ? "#000000"
                      : contrastTheme.bar,
                  color:
                    contrast === "black-on-white" && canGoNextPassage
                      ? "#ffffff"
                      : contrastTheme.fg,
                }}
              >
                <ChevronRight size={16} strokeWidth={2.5} />
              </button>
            </div>
          </div>

          <ReadingNotesPanel
            open={notesOpen}
            marks={marks}
            activeNoteId={activeNoteId}
            theme={contrastTheme}
            onClose={() => {
              setNotesOpen(false);
              setActiveNoteId(null);
            }}
            onSelectNote={setActiveNoteId}
            onUpdateNote={updateNoteText}
            onDelete={deleteMark}
          />
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
        theme={contrastTheme}
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
