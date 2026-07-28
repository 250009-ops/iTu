"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useTeacherSpeaking } from "@/contexts/teacher-speaking-context";
import {
  assertSpeakingScoresComplete,
  bandOptions,
  computeOverall,
  emptySpeakingScores,
  speakingGradeIsDirty,
  speakingScoresComplete,
  toSpeakingCriteriaPayload,
  type ScoringCriterion,
  type SpeakingScoreValues,
} from "@/lib/speaking/scoring";
import { scoreSpeaking } from "@/lib/api/grading";
import { getErrorMessage } from "@/lib/api/errors";
import { useToast } from "@/components/ui/toast";
import { useExaminerPaths } from "@/hooks/use-examiner-paths";
import { useSpeakingRoom } from "@/contexts/speaking-room-context";
import { cn } from "@/lib/utils";

function ScoreRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (score: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium leading-snug text-white/85">{label}</p>
        <span
          className={cn(
            "shrink-0 text-lg font-bold tabular-nums",
            value != null ? "text-sky-300" : "text-white/35",
          )}
        >
          {value != null ? value : "—"}
        </span>
      </div>
      <div className="grid grid-cols-5 gap-1.5">
        {bandOptions.map((score) => (
          <button
            key={score}
            type="button"
            onClick={() => onChange(score)}
            className={cn(
              "flex h-9 items-center justify-center rounded-lg text-xs font-semibold transition-colors",
              value === score
                ? "bg-sky-400 text-slate-950 shadow-sm"
                : "bg-white/10 text-white/75 hover:bg-white/20",
            )}
          >
            {score}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ScoringSidebar() {
  const router = useRouter();
  const { speaking } = useExaminerPaths();
  const { session, sessionId, refreshSession, refreshHub } = useTeacherSpeaking();
  const [scores, setScores] = useState<SpeakingScoreValues>(emptySpeakingScores());
  const [notes, setNotes] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const { endSession, leaveRoom } = useSpeakingRoom();
  const syncedGradeKeyRef = useRef<string | null>(null);

  const savedGradeKey = session
    ? `${session.id}:${session.graded}:${JSON.stringify(session.defaultScores)}:${session.teacherNotes ?? ""}`
    : null;

  useEffect(() => {
    if (!session || !savedGradeKey) return;
    if (syncedGradeKeyRef.current === savedGradeKey) return;
    syncedGradeKeyRef.current = savedGradeKey;
    setScores(session.defaultScores);
    setNotes(session.teacherNotes);
  }, [session, savedGradeKey]);

  const overall = useMemo(() => computeOverall(scores), [scores]);
  const alreadyGraded = session?.graded ?? false;
  const gradeDirty = useMemo(() => {
    if (!session) return false;
    return speakingGradeIsDirty(scores, notes, {
      scores: session.defaultScores,
      notes: session.teacherNotes ?? "",
    });
  }, [session, scores, notes]);
  const allCriteriaScored = speakingScoresComplete(scores);
  const canSubmit = allCriteriaScored && (!alreadyGraded || gradeDirty);

  if (!session) return null;

  function setScore(criterion: ScoringCriterion, value: number) {
    setScores((prev) => ({ ...prev, [criterion]: value }));
  }

  async function submitGrade() {
    if (!session || !sessionId || overall == null) return;
    setConfirmOpen(false);
    setSubmitting(true);
    try {
      const completeScores = assertSpeakingScoresComplete(scores);
      await scoreSpeaking(sessionId, {
        criteriaScores: toSpeakingCriteriaPayload(completeScores),
        overallBand: overall,
        feedback: notes.trim() || undefined,
        teacherNotes: notes.trim() || undefined,
      });
      toast(alreadyGraded ? "Grade updated" : "Grade submitted", {
        description: `${session.studentName} · Speaking band ${overall.toFixed(1)}`,
        variant: "success",
      });
      // End the live session for the student, then disconnect the examiner.
      try {
        await endSession();
      } catch {
        // Grade already marked complete on the server; still notify via sync below.
      }
      try {
        await leaveRoom();
      } catch {
        // Navigation will unmount the room provider regardless.
      }
      await refreshSession();
      await refreshHub();
      router.push(speaking(sessionId ?? undefined));
    } catch (err) {
      toast("Could not submit grade", {
        description: getErrorMessage(err, "Please try again."),
        variant: "error",
      });
      setSubmitting(false);
    }
  }

  return (
    <>
      <aside
        className="flex h-full min-w-0 flex-col border-l border-white/10 bg-slate-900/90"
        aria-label="Live band scoring"
      >
        <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-5">
          <div className="rounded-xl bg-white/5 px-4 py-4 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/45">
              Band score
            </p>
            <p className="mt-1 text-5xl font-bold tabular-nums leading-none text-white">
              {overall != null ? overall.toFixed(1) : "—"}
            </p>
          </div>

          <div className="mt-5 space-y-5">
            {session.criteria.map((criterion) => (
              <ScoreRow
                key={criterion.id}
                label={criterion.label}
                value={scores[criterion.id]}
                onChange={(v) => setScore(criterion.id, v)}
              />
            ))}
          </div>

          <textarea
            placeholder="Examiner notes and observations…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className="mt-5 w-full resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/35 focus:border-sky-400/50 focus:bg-white/8 focus:outline-none focus:ring-1 focus:ring-sky-400/30"
          />

          {session.recordingUrl && (
            <a
              href={session.recordingUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 block text-center text-xs text-sky-300 hover:text-sky-200 hover:underline"
            >
              Open speaking recording
            </a>
          )}
        </div>

        <div className="shrink-0 border-t border-white/10 px-4 py-4 sm:px-5">
          <Button
            variant="danger"
            size="default"
            className="h-11 w-full"
            loading={submitting}
            disabled={!canSubmit}
            onClick={() => setConfirmOpen(true)}
          >
            <Save className="h-4 w-4" />
            {alreadyGraded ? "Update grade" : "Submit grade"}
          </Button>
        </div>
      </aside>

      <ConfirmDialog
        open={confirmOpen}
        title={alreadyGraded ? "Update speaking grade" : "Submit speaking grade"}
        message={`${alreadyGraded ? "Update" : "Submit"} band ${overall?.toFixed(1) ?? "—"} for ${session.studentName}?`}
        confirmLabel={alreadyGraded ? "Update grade" : "Submit grade"}
        onConfirm={submitGrade}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}

/** @deprecated Use ScoringSidebar in the split live console layout. */
export const ScoringOverlay = ScoringSidebar;
