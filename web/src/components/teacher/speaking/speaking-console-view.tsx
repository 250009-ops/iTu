"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { SpeakingHubView } from "@/components/teacher/speaking/speaking-hub-view";
import { SpeakingLiveConsole } from "@/components/teacher/speaking/speaking-live-console";
import { SpeakingSessionDetail } from "@/components/teacher/speaking/speaking-session-detail";
import { SpeakingRoomProvider } from "@/contexts/speaking-room-context";
import { TeacherSpeakingProvider } from "@/contexts/teacher-speaking-context";

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
        <SpeakingRouter />
      </TeacherSpeakingProvider>
    </Suspense>
  );
}

function SpeakingRouter() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session");
  const isLive = searchParams.get("live") === "1";

  if (isLive && sessionId) {
    return (
      <SpeakingRoomProvider speakingSessionId={sessionId} role="examiner">
        <SpeakingLiveConsole />
      </SpeakingRoomProvider>
    );
  }

  if (sessionId) {
    return <SpeakingSessionDetail />;
  }

  return <SpeakingHubView />;
}
