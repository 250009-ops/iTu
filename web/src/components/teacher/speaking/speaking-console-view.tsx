"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { SpeakingEmptyState } from "@/components/teacher/speaking/speaking-empty-state";
import { SpeakingLiveConsole } from "@/components/teacher/speaking/speaking-live-console";
import { LiveScoringPanel } from "@/components/teacher/speaking/live-scoring-panel";
import { SpeakingSessionHeader } from "@/components/teacher/speaking/session-header";
import { SpeakingRoomProvider } from "@/contexts/speaking-room-context";
import {
  TeacherSpeakingProvider,
  useTeacherSpeaking,
} from "@/contexts/teacher-speaking-context";
import { Button } from "@/components/ui/button";

export function SpeakingConsoleView() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center p-8">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-navy border-t-transparent" />
        </div>
      }
    >
      <TeacherSpeakingProvider>
        <SpeakingContent />
      </TeacherSpeakingProvider>
    </Suspense>
  );
}

function SpeakingContent() {
  const { loading, error, isEmpty, session, todaySessions, sessionId } =
    useTeacherSpeaking();

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-navy border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="mx-auto max-w-lg rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-800">
          <p className="font-semibold">Failed to load speaking session</p>
          <p className="mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (isEmpty || !session || !sessionId) {
    return <SpeakingEmptyState todaySessions={todaySessions} />;
  }

  const sessionCompleted =
    session.status === "completed" || session.activePhase === "complete";

  return (
    <>
      <div className="p-4 lg:p-6 xl:p-8">
        <div className="mx-auto max-w-3xl space-y-6">
          <SpeakingSessionHeader />
          <div className="rounded-xl border border-border bg-white p-6 shadow-sm">
            {sessionCompleted ? (
              session.graded ? (
                <>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    <h2 className="text-lg font-bold text-navy">
                      Grade submitted
                    </h2>
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
                    <strong className="text-navy">{session.studentName}</strong>{" "}
                    has ended but is not graded yet. Submit the candidate&apos;s
                    band scores below.
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
                <p className="mt-1 text-sm text-muted">
                  Student:{" "}
                  <strong className="text-navy">{session.studentName}</strong>
                  {" · "}
                  {session.timeRange}
                </p>
                <Link
                  href={`/teacher/speaking?session=${sessionId}&live=1`}
                  className="mt-4 inline-block"
                >
                  <Button size="lg">Enter live console</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
      <LiveConsoleGate sessionCompleted={sessionCompleted} sessionId={sessionId} />
    </>
  );
}

function LiveConsoleGate({
  sessionCompleted,
  sessionId,
}: {
  sessionCompleted: boolean;
  sessionId: string;
}) {
  const searchParams = useSearchParams();
  const isLive = searchParams.get("live") === "1";
  // Only mount the LiveKit room (and the examiner's mic/camera) while actually
  // running the live console. Leaving the console or finishing the session
  // unmounts the provider, which disconnects audio/video.
  if (!isLive || sessionCompleted) return null;
  return (
    <SpeakingRoomProvider speakingSessionId={sessionId} role="examiner">
      <SpeakingLiveConsole />
    </SpeakingRoomProvider>
  );
}
