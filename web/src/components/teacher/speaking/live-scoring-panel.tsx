"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Award, Save } from "lucide-react";
import { BandScoreStepper } from "@/components/teacher/grading/band-score-stepper";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useTeacherSpeaking } from "@/contexts/teacher-speaking-context";
import {
  assertSpeakingScoresComplete,
  computeOverall,
  emptySpeakingScores,
  speakingGradeIsDirty,
  speakingCriteria,
  speakingScoresComplete,
  toSpeakingCriteriaPayload,
  type ScoringCriterion,
  type SpeakingScoreValues,
} from "@/lib/speaking/scoring";
import { scoreSpeaking } from "@/lib/api/grading";
import { getErrorMessage } from "@/lib/api/errors";
import { useToast } from "@/components/ui/toast";

export function LiveScoringPanel() {
  const { session, sessionId, refreshSession, refreshHub } = useTeacherSpeaking();
  const [scores, setScores] = useState<SpeakingScoreValues>(emptySpeakingScores());
  const [notes, setNotes] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
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
      await refreshSession();
      await refreshHub();
    } catch (err) {
      toast("Could not submit grade", {
        description: getErrorMessage(err, "Please try again."),
        variant: "error",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <Award className="h-5 w-5 text-amber-500" />
        <h2 className="font-semibold text-navy">Live Scoring</h2>
      </div>

      <div className="mt-4 space-y-2">
        {speakingCriteria.map((criterion) => (
          <div
            key={criterion.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-slate-50/60 px-3 py-2"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-navy">
                {criterion.label}
              </p>
              <p className="text-[11px] font-bold tabular-nums text-sky-600">
                {scores[criterion.id] ?? "—"}
              </p>
            </div>
            {scores[criterion.id] != null ? (
              <BandScoreStepper
                value={scores[criterion.id]!}
                onChange={(v) => setScore(criterion.id, v)}
              />
            ) : (
              <select
                aria-label={`Select ${criterion.label} band`}
                value=""
                onChange={(e) => setScore(criterion.id, Number(e.target.value))}
                className="h-8 rounded-lg border border-border bg-white px-2 text-xs font-semibold text-navy"
              >
                <option value="" disabled>
                  Select
                </option>
                {Array.from({ length: 19 }, (_, i) => i * 0.5).map((score) => (
                  <option key={score} value={score}>
                    {Number.isInteger(score) ? score.toFixed(0) : score.toFixed(1)}
                  </option>
                ))}
              </select>
            )}
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-lg bg-sky-50 px-4 py-3">
        <p className="text-xs font-medium text-muted">Overall Band</p>
        <p className="text-3xl font-bold text-sky-600">
          {overall != null ? overall.toFixed(1) : "—"}
        </p>
      </div>

      <textarea
        placeholder="Add examiner notes and observations…"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={4}
        className="mt-4 w-full resize-none rounded-lg border border-border bg-slate-50 px-3 py-2.5 text-sm placeholder:text-slate-400 focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-100"
      />

      <Button
        variant="danger"
        size="default"
        className="mt-4 w-full"
        loading={submitting}
        disabled={!canSubmit}
        onClick={() => setConfirmOpen(true)}
      >
        <Save className="h-4 w-4" />
        {alreadyGraded ? "Update Grade" : "Save & Submit Grade"}
      </Button>

      <div className="mt-4 border-t border-border pt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          Session recording
        </p>
        {session.recordingUrl ? (
          <a
            href={session.recordingUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex text-sm font-semibold text-sky-600 hover:underline"
          >
            Open speaking recording
          </a>
        ) : (
          <p className="mt-2 text-sm text-muted">
            Recording link appears after the live session ends.
          </p>
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title={alreadyGraded ? "Update speaking grade" : "Submit speaking grade"}
        message={`${alreadyGraded ? "Update" : "Submit"} an overall band of ${overall?.toFixed(1) ?? "—"} for ${session.studentName}? This is recorded against the candidate's results.`}
        confirmLabel={alreadyGraded ? "Update grade" : "Submit grade"}
        onConfirm={submitGrade}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
