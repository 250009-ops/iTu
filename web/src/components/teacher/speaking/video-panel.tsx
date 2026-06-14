"use client";

import { useEffect, useState } from "react";
import { useTeacherSpeaking } from "@/contexts/teacher-speaking-context";
import {
  LivekitSetupNotice,
  useSpeakingRoom,
} from "@/contexts/speaking-room-context";
import {
  SpeakingControlBar,
  SpeakingVideoLayout,
} from "@/components/speaking/speaking-video-layout";
import { formatElapsed } from "@/lib/speaking/scoring";

export function VideoPanel() {
  const { session } = useTeacherSpeaking();
  const { state, participantCount, livekitConfigured } = useSpeakingRoom();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  if (!session) return null;

  if (!livekitConfigured) {
    return <LivekitSetupNotice />;
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <SpeakingVideoLayout
          remoteLabel={session.studentName}
          localLabel="You"
          remotePlaceholder={session.studentInitials}
          localPlaceholder={session.studentInitials.slice(0, 1)}
        />
        <div className="absolute right-4 top-4 z-20 flex items-center gap-3">
          <span className="rounded-lg bg-black/40 px-3 py-1.5 font-mono text-lg font-bold tabular-nums text-white">
            {formatElapsed(elapsed)}
          </span>
          <span className="rounded-full bg-black/40 px-3 py-1 text-xs font-semibold text-white">
            {participantCount} in room
          </span>
        </div>
      </div>
      <SpeakingControlBar />
      {state && (
        <p className="text-center text-xs text-muted">
          Live session with {state.studentName} · Phase {state.activePhase}
        </p>
      )}
    </div>
  );
}
