"use client";

import { Suspense } from "react";
import { LiveScoringPanel } from "@/components/teacher/speaking/live-scoring-panel";
import { SessionControls } from "@/components/teacher/speaking/session-controls";
import { SpeakingEmptyState } from "@/components/teacher/speaking/speaking-empty-state";
import { SpeakingSessionHeader } from "@/components/teacher/speaking/session-header";
import { VideoPanel } from "@/components/teacher/speaking/video-panel";
import { SpeakingRoomProvider } from "@/contexts/speaking-room-context";
import {
  TeacherSpeakingProvider,
  useTeacherSpeaking,
} from "@/contexts/teacher-speaking-context";

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

  return (
    <SpeakingRoomProvider speakingSessionId={sessionId} role="examiner">
      <div className="p-4 lg:p-6 xl:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <SpeakingSessionHeader />

          <div className="flex flex-col gap-6 lg:flex-row">
            <div className="min-w-0 flex-1">
              <VideoPanel />
            </div>
            <div className="flex flex-col gap-4 lg:w-80 lg:shrink-0">
              <SessionControls />
              <LiveScoringPanel />
            </div>
          </div>
        </div>
      </div>
    </SpeakingRoomProvider>
  );
}
