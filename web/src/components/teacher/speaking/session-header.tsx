"use client";

import { Clock, Radio, User } from "lucide-react";
import { useTeacherSpeaking } from "@/contexts/teacher-speaking-context";
import { useSpeakingRoom } from "@/contexts/speaking-room-context";

export function SpeakingSessionHeader() {
  const { session } = useTeacherSpeaking();
  const { state } = useSpeakingRoom();
  if (!session) return null;

  const { studentName, timeRange, activePart, status, activePhase } = session;
  const recordingActive = state?.recordingActive ?? false;
  const sessionCompleted =
    status === "completed" || activePhase === "complete";

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-navy sm:text-3xl">
        Speaking Examiner Console
      </h1>
      <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
        <span className="flex items-center gap-1.5 text-muted">
          <User className="h-4 w-4" />
          {studentName}
        </span>
        <span className="flex items-center gap-1.5 text-muted">
          <Clock className="h-4 w-4" />
          {timeRange}
        </span>
        {sessionCompleted ? (
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
            Session complete
          </span>
        ) : (
          <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700">
            Part {activePart} Active
          </span>
        )}
        {recordingActive && (
          <span className="flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700">
            <Radio className="h-3.5 w-3.5 animate-pulse" />
            Recording
          </span>
        )}
        {state?.recordingUrl && (
          <a
            href={state.recordingUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
          >
            View recording
          </a>
        )}
      </div>
    </div>
  );
}
