"use client";

import { useEffect, useMemo, useState } from "react";
import { Award, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useTeacherSpeaking } from "@/contexts/teacher-speaking-context";
import {
  bandOptions,
  computeOverall,
  toSpeakingCriteriaPayload,
  type ScoringCriterion,
} from "@/lib/speaking/scoring";
import { scoreSpeaking } from "@/lib/api/grading";
import { getErrorMessage } from "@/lib/api/errors";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

function ScoreRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (score: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-navy">{label}</p>
        <span className="text-lg font-bold text-sky-600">{value}</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {bandOptions.map((score) => (
          <button
            key={score}
            type="button"
            onClick={() => onChange(score)}
            className={cn(
              "flex h-8 min-w-[2rem] items-center justify-center rounded-full px-1.5 text-xs font-semibold transition-colors",
              value === score
                ? "bg-navy text-white"
                : "bg-slate-100 text-muted hover:bg-slate-200",
            )}
          >
            {score}
          </button>
        ))}
      </div>
    </div>
  );
}

export function LiveScoringPanel() {
  const { session, sessionId, refreshSession, refreshHub } = useTeacherSpeaking();
  const [scores, setScores] = useState(
    session?.defaultScores ?? {
      fluency: 7,
      lexical: 7,
      grammar: 7,
      pronunciation: 7,
    },
  );
  const [notes, setNotes] = useState(session?.teacherNotes ?? "");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (session) {
      setScores(session.defaultScores);
      setNotes(session.teacherNotes);
    }
  }, [session]);

  const overall = useMemo(() => computeOverall(scores), [scores]);
  const alreadyGraded = session?.graded ?? false;

  if (!session) return null;

  function setScore(criterion: ScoringCriterion, value: number) {
    setScores((prev) => ({ ...prev, [criterion]: value }));
  }

  async function submitGrade() {
    if (!session || !sessionId) return;
    setConfirmOpen(false);
    setSubmitting(true);
    try {
      await scoreSpeaking(sessionId, {
        criteriaScores: toSpeakingCriteriaPayload(scores),
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

      <div className="mt-4 space-y-5">
        {session.criteria.map((criterion) => (
          <ScoreRow
            key={criterion.id}
            label={criterion.label}
            value={scores[criterion.id]}
            onChange={(v) => setScore(criterion.id, v)}
          />
        ))}
      </div>

      <div className="mt-5 rounded-lg bg-sky-50 px-4 py-3">
        <p className="text-xs font-medium text-muted">Overall Band</p>
        <p className="text-3xl font-bold text-sky-600">{overall.toFixed(1)}</p>
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
        message={`${alreadyGraded ? "Update" : "Submit"} an overall band of ${overall.toFixed(1)} for ${session.studentName}? This is recorded against the candidate's results.`}
        confirmLabel={alreadyGraded ? "Update grade" : "Submit grade"}
        onConfirm={submitGrade}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
