"use client";

import { useEffect, useMemo, useState } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useTeacherSpeaking } from "@/contexts/teacher-speaking-context";
import {
  bandOptions,
  computeOverall,
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
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-medium leading-tight text-white/75">
          {label}
        </p>
        <span className="text-sm font-bold tabular-nums text-sky-300">
          {value}
        </span>
      </div>
      <div className="flex flex-wrap gap-0.5">
        {bandOptions.map((score) => (
          <button
            key={score}
            type="button"
            onClick={() => onChange(score)}
            className={cn(
              "flex h-6 min-w-[1.5rem] items-center justify-center rounded-full px-0.5 text-[10px] font-semibold transition-colors",
              value === score
                ? "bg-sky-400/90 text-slate-950"
                : "bg-white/10 text-white/70 hover:bg-white/20",
            )}
          >
            {score}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ScoringOverlay() {
  const { session, sessionId } = useTeacherSpeaking();
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

  if (!session) return null;

  function setScore(criterion: ScoringCriterion, value: number) {
    setScores((prev) => ({ ...prev, [criterion]: value }));
  }

  async function submitGrade() {
    if (!session || !sessionId) return;
    setConfirmOpen(false);
    setSubmitting(true);
    try {
      const criteriaScores = Object.fromEntries(
        session.criteria.map((c) => [c.label, scores[c.id]]),
      );
      await scoreSpeaking(sessionId, {
        criteriaScores,
        overallBand: overall,
        feedback: notes.trim() || undefined,
        teacherNotes: notes.trim() || undefined,
      });
      toast("Grade submitted", {
        description: `${session.studentName} · Speaking band ${overall.toFixed(1)}`,
        variant: "success",
      });
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
    <>
      <div
        className="pointer-events-auto absolute inset-y-0 right-0 z-30 flex w-[min(100%,15.5rem)] flex-col justify-center bg-gradient-to-l from-black/75 via-black/45 to-transparent px-3 py-6 sm:w-64 sm:px-4"
        aria-label="Live band scoring"
      >
        <div className="ml-auto w-full max-w-[13.5rem] space-y-3 sm:max-w-none">
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45">
              Band score
            </p>
            <p className="text-3xl font-bold tabular-nums leading-none text-white">
              {overall.toFixed(1)}
            </p>
          </div>

          <div className="space-y-3 border-t border-white/10 pt-3">
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
            placeholder="Examiner notes…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full resize-none rounded-md border-0 bg-white/8 px-2.5 py-2 text-[11px] text-white placeholder:text-white/35 focus:bg-white/12 focus:outline-none focus:ring-1 focus:ring-sky-400/40"
          />

          <Button
            variant="danger"
            size="sm"
            className="h-8 w-full text-xs"
            loading={submitting}
            onClick={() => setConfirmOpen(true)}
          >
            <Save className="h-3.5 w-3.5" />
            Submit grade
          </Button>

          {session.recordingUrl && (
            <a
              href={session.recordingUrl}
              target="_blank"
              rel="noreferrer"
              className="block text-right text-[10px] text-sky-300/90 hover:text-sky-200 hover:underline"
            >
              Open recording
            </a>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Submit speaking grade"
        message={`Submit band ${overall.toFixed(1)} for ${session.studentName}?`}
        confirmLabel="Submit grade"
        onConfirm={submitGrade}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}
