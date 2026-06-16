"use client";

import { useEffect, useMemo, useState } from "react";
import { Award, ChevronDown, ChevronUp, Save } from "lucide-react";
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
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-white/90">{label}</p>
        <span className="text-sm font-bold text-sky-300">{value}</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {bandOptions.map((score) => (
          <button
            key={score}
            type="button"
            onClick={() => onChange(score)}
            className={cn(
              "flex h-7 min-w-[1.75rem] items-center justify-center rounded-full px-1 text-[11px] font-semibold transition-colors",
              value === score
                ? "bg-white text-navy"
                : "bg-white/15 text-white/80 hover:bg-white/25",
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
  const [open, setOpen] = useState(false);
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
      <div className="absolute bottom-24 right-4 z-30 w-[min(100%,20rem)]">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center justify-between rounded-t-xl border border-white/20 bg-slate-900/90 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-md"
        >
          <span className="flex items-center gap-2">
            <Award className="h-4 w-4 text-amber-400" />
            Scoring · Band {overall.toFixed(1)}
          </span>
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </button>

        {open && (
          <div className="max-h-[min(50vh,24rem)] overflow-y-auto rounded-b-xl border border-t-0 border-white/20 bg-slate-900/95 p-4 backdrop-blur-md">
            <div className="space-y-4">
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
              rows={3}
              className="mt-4 w-full resize-none rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-xs text-white placeholder:text-white/40 focus:border-sky-400 focus:outline-none"
            />

            <Button
              variant="danger"
              size="sm"
              className="mt-3 w-full"
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
                className="mt-2 block text-center text-xs text-sky-300 hover:underline"
              >
                Open recording
              </a>
            )}
          </div>
        )}
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
