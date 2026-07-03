"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Cloud, GripVertical, PenLine } from "lucide-react";
import type { WritingContent } from "@/lib/exam/types";
import { ExamTopBar } from "@/components/exam/shell/exam-top-bar";
import { ExamTimer } from "@/components/exam/shell/exam-timer";
import { SubmitDialog } from "@/components/exam/shell/submit-dialog";
import { TaskVisual } from "@/components/exam/writing/task-visual";
import { InstructionScreen } from "@/components/exam/questions/instruction-screen";
import { useExamState, TEXT_SIZE_CLASS } from "@/lib/exam/use-exam-state";
import { countWords } from "@/lib/exam/helpers";
import { cn } from "@/lib/utils";
import { useExamContent } from "@/hooks/use-exam-content";
import { useServerTimer } from "@/hooks/use-server-timer";
import { useWritingAutosave } from "@/hooks/use-writing-autosave";
import { useExamIntegrity } from "@/hooks/use-exam-integrity";
import { useExamSectionSync } from "@/hooks/use-exam-section-sync";
import { EssayEditor } from "@/components/exam/writing/essay-editor";
import { startSection, submitSection, submitWriting, getExamSession } from "@/lib/api/exam";
import { examRouteAfterSection, examResumeRoute } from "@/lib/exam/package-skills";
import { ApiDataShell } from "@/components/shared/api-data-shell";
import { ExamIntegrityWarning } from "@/components/exam/shell/exam-integrity-warning";
import { ExamRemoteNotice } from "@/components/exam/shell/exam-remote-notice";

export function WritingPlayer({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const { content, loading, error } = useExamContent<WritingContent>(
    sessionId,
    "writing",
  );
  const [started, setStarted] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [introDismissed, setIntroDismissed] = useState<Record<string, boolean>>({});
  const [essays, setEssays] = useState<Record<string, string>>({});
  const [leftPct, setLeftPct] = useState(46);
  const draggingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const state = useExamState(content?.tasks[0]?.id ?? "task-1");
  const { remaining, expired } = useServerTimer(sessionId, { enabled: started });
  const { warning, dismissWarning } = useExamIntegrity(sessionId);
  const { markLocalSubmit, remoteNotice } = useExamSectionSync(sessionId, "writing", {
    enabled: started,
  });

  const task1 = content?.tasks.find((t) => t.taskNumber === 1);
  const task2 = content?.tasks.find((t) => t.taskNumber === 2);
  const task1Text = task1 ? (essays[task1.id] ?? "") : "";
  const task2Text = task2 ? (essays[task2.id] ?? "") : "";
  const saveStatus = useWritingAutosave(sessionId, task1Text, task2Text);

  useEffect(() => {
    if (!content || started) return;
    void startSection(sessionId, "writing")
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

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!draggingRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pct = ((e.clientX - rect.left) / rect.width) * 100;
    setLeftPct(Math.min(68, Math.max(30, pct)));
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

  const activeTask =
    content?.tasks.find((t) => t.id === state.activePart) ?? content?.tasks[0];
  const essay = activeTask ? (essays[activeTask.id] ?? "") : "";
  const words = countWords(essay);
  const meetsMin = activeTask ? words >= activeTask.minWords : false;

  const completedTasks = useMemo(
    () =>
      content?.tasks.filter(
        (t) => countWords(essays[t.id] ?? "") >= t.minWords,
      ).length ?? 0,
    [content?.tasks, essays],
  );

  if (loading || !content || !activeTask) {
    return <ApiDataShell loading={loading} error={error} />;
  }

  async function handleSubmit() {
    setSubmitting(true);
    markLocalSubmit();
    try {
      await submitWriting(sessionId, task1Text, task2Text);
      const updated = await submitSection(sessionId, "writing");
      router.push(
        examRouteAfterSection(
          sessionId,
          updated.enrollment.package.skills,
          "writing",
        ),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <ExamIntegrityWarning warning={warning} onDismiss={dismissWarning} />
      <ExamRemoteNotice message={remoteNotice} />

      <ExamTopBar
        testTakerId={sessionId}
        timer={<ExamTimer remainingSeconds={remaining} hidden={state.hideTimer} />}
        textSize={state.textSize}
        onTextSize={state.setTextSize}
        hideTimer={state.hideTimer}
        onToggleTimer={state.setHideTimer}
      />

      {activeTask.introScreen && !introDismissed[activeTask.id] && (
        <InstructionScreen
          group={{
            id: `${activeTask.id}-intro`,
            type: "instruction_screen",
            from: 0,
            to: 0,
            instruction: activeTask.instruction,
            body: activeTask.introScreen.body,
            buttonLabel: activeTask.introScreen.buttonLabel,
          }}
          overlay
          onContinue={() =>
            setIntroDismissed((prev) => ({ ...prev, [activeTask.id]: true }))
          }
        />
      )}

      <div className="flex shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-5 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600 text-white">
          <PenLine size={16} />
        </div>
        <div>
          <p className="text-[14px] font-bold text-navy">
            Part {activeTask.part} · Task {activeTask.taskNumber}
          </p>
          <p className="text-[13px] text-slate-500">{activeTask.instruction}</p>
        </div>
      </div>

      <div ref={containerRef} className="flex min-h-0 flex-1 overflow-hidden">
        <div
          className="min-h-0 overflow-y-auto bg-white px-6 py-6"
          style={{ width: `${leftPct}%` }}
        >
          <div className={`space-y-5 ${TEXT_SIZE_CLASS[state.textSize]}`}>
            <span className="inline-block rounded-md bg-violet-100 px-2.5 py-1 text-[12px] font-bold text-violet-700">
              Task {activeTask.taskNumber} · {activeTask.minWords}+ words ·{" "}
              {activeTask.minutes} min
            </span>
            <div className="whitespace-pre-line leading-7 text-slate-700">
              {activeTask.prompt}
            </div>
            {activeTask.visual && <TaskVisual visual={activeTask.visual} />}
          </div>
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

        <div className="flex min-h-0 flex-1 flex-col bg-slate-50" data-exam-surface>
          <EssayEditor
            key={activeTask.id}
            value={essay}
            onChange={(v) =>
              setEssays((prev) => ({ ...prev, [activeTask.id]: v }))
            }
            placeholder="Type your answer here. Use Ctrl+X to cut, Ctrl+V to paste, and Ctrl+Z to undo."
            textSizeClass={TEXT_SIZE_CLASS[state.textSize]}
            style={{ backgroundColor: "#ffffff", color: "#1e293b" }}
          />
          <div className="flex items-center justify-between border-t border-slate-200 bg-white px-6 py-2.5">
            <span className="flex items-center gap-1.5 text-[12px] text-slate-400">
              <Cloud size={14} />
              {saveStatus === "saving"
                ? "Saving…"
                : saveStatus === "saved"
                  ? "All changes saved"
                  : "Autosave on"}
            </span>
            <span
              className={cn(
                "text-[13px] font-semibold tabular-nums",
                meetsMin ? "text-emerald-600" : "text-slate-500",
              )}
            >
              Words: {words}
              <span className="ml-1 font-normal text-slate-400">
                / {activeTask.minWords} min
              </span>
            </span>
          </div>
        </div>
      </div>

      <footer className="z-20 flex shrink-0 items-center gap-2 border-t border-slate-200 bg-white px-4 py-2.5">
        <div className="flex flex-1 gap-2">
          {content.tasks.map((t) => {
            const tWords = countWords(essays[t.id] ?? "");
            const done = tWords >= t.minWords;
            const isActive = t.id === state.activePart;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => state.setActivePart(t.id)}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-3 py-1.5 text-left transition",
                  isActive
                    ? "border-navy bg-white shadow-sm"
                    : "border-transparent hover:bg-slate-50",
                )}
              >
                {done && <Check size={14} className="text-emerald-500" />}
                <span>
                  <span
                    className={cn(
                      "block text-[12px] font-bold",
                      isActive ? "text-navy" : "text-slate-600",
                    )}
                  >
                    Task {t.taskNumber}
                  </span>
                  <span className="block text-[11px] text-slate-400">
                    {tWords} words
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => setSubmitOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-brand-red px-4 py-2 text-[13px] font-semibold text-white hover:bg-brand-red-hover"
        >
          <Check size={15} />
          End Writing
        </button>
      </footer>

      <SubmitDialog
        open={submitOpen}
        title="End the Writing section?"
        message="Both tasks will be submitted to your assigned examiner for grading. You cannot return to Writing."
        answered={completedTasks}
        total={content.tasks.length}
        confirmLabel={submitting ? "Submitting…" : "Submit Writing"}
        onCancel={() => !expired && setSubmitOpen(false)}
        onConfirm={() => void handleSubmit()}
      />
    </>
  );
}
