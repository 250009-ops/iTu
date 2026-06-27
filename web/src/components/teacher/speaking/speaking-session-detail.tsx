"use client";

import Link from "next/link";
import { ArrowLeft, CheckCircle2, Play } from "lucide-react";
import { LiveScoringPanel } from "@/components/teacher/speaking/live-scoring-panel";
import { useTeacherSpeaking } from "@/contexts/teacher-speaking-context";
import {
  formatJoinOpensAt,
  speakingJoinAccess,
} from "@/lib/speaking/slot-access";
import { Button } from "@/components/ui/button";

export function SpeakingSessionDetail() {
  const { session, sessionId, sessionLoading, sessionError } =
    useTeacherSpeaking();

  if (sessionLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-navy border-t-transparent" />
      </div>
    );
  }

  if (sessionError || !session || !sessionId) {
    return (
      <div className="p-8">
        <div className="mx-auto max-w-lg rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-800">
          <p className="font-semibold">Session not found</p>
          <p className="mt-1">
            {sessionError ?? "This speaking session could not be loaded."}
          </p>
          <Link href="/teacher/speaking" className="mt-4 inline-block">
            <Button variant="secondary" size="sm">
              Back to sessions
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const sessionCompleted =
    session.status === "completed" || session.activePhase === "complete";
  const slotAccess = speakingJoinAccess(session.scheduledAt);

  return (
    <div className="p-4 lg:p-6 xl:p-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <Link
          href="/teacher/speaking"
          className="inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-navy"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to sessions
        </Link>

        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy sm:text-3xl">
            Speaking Examiner Console
          </h1>
          <p className="mt-1 text-sm text-muted">
            {session.studentName} · {session.timeRange}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-white p-6 shadow-sm">
          {sessionCompleted ? (
            session.graded ? (
              <>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  <h2 className="text-lg font-bold text-navy">Grade submitted</h2>
                </div>
                <p className="mt-2 text-sm text-muted">
                  <strong className="text-navy">{session.studentName}</strong>
                  &apos;s speaking session is complete and graded
                  {session.gradedBand != null && (
                    <>
                      {" "}
                      with an overall band of{" "}
                      <strong className="text-navy">
                        {session.gradedBand.toFixed(1)}
                      </strong>
                    </>
                  )}
                  . The student will see results once all sections are released.
                </p>
                {session.recordingUrl && (
                  <a
                    href={session.recordingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-block text-sm font-semibold text-sky-600 hover:underline"
                  >
                    Open speaking recording
                  </a>
                )}
              </>
            ) : (
              <>
                <h2 className="text-lg font-bold text-navy">Session complete</h2>
                <p className="mt-2 text-sm text-muted">
                  This speaking session with{" "}
                  <strong className="text-navy">{session.studentName}</strong> has
                  ended but is not graded yet. Submit the candidate&apos;s band
                  scores below.
                </p>
                {session.recordingUrl && (
                  <a
                    href={session.recordingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-block text-sm font-semibold text-sky-600 hover:underline"
                  >
                    Open speaking recording
                  </a>
                )}
                <div className="mt-5">
                  <LiveScoringPanel />
                </div>
              </>
            )
          ) : (
            <>
              <h2 className="text-lg font-bold text-navy">Ready to examine?</h2>
              <p className="mt-2 text-sm text-muted">
                Open the full-screen live console to run the speaking test with
                video, content-driven prompts from the published bank, and
                in-call scoring.
              </p>
              {!slotAccess.allowed && slotAccess.tooEarly && slotAccess.opensAt && (
                <p className="mt-3 text-sm text-amber-800">
                  Opens at {formatJoinOpensAt(slotAccess.opensAt)} (5 minutes
                  before the scheduled start).
                </p>
              )}
              <Link
                href={
                  slotAccess.allowed
                    ? `/teacher/speaking?session=${sessionId}&live=1`
                    : "#"
                }
                className="mt-4 inline-block"
                aria-disabled={!slotAccess.allowed}
                onClick={(e) => {
                  if (!slotAccess.allowed) e.preventDefault();
                }}
              >
                <Button variant="danger" size="lg" disabled={!slotAccess.allowed}>
                  <Play className="h-4 w-4 fill-current" />
                  {slotAccess.allowed ? "Enter live console" : "Opens soon"}
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
