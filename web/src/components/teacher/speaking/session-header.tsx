"use client";

import { Clock, User } from "lucide-react";
import { useTeacherSpeaking } from "@/contexts/teacher-speaking-context";

export function SpeakingSessionHeader() {
  const { session } = useTeacherSpeaking();
  if (!session) return null;

  const { studentName, timeRange, activePart, status, activePhase } = session;
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
        {session.recordingUrl && (
          <a
            href={session.recordingUrl}
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
