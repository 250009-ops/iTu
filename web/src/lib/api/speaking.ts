import { apiFetch } from "./client";
import type { SpeakingPhase } from "@/lib/speaking/sync";

export type SpeakingState = {
  id: string;
  status: string;
  activePhase: SpeakingPhase;
  examinerReady: boolean;
  scheduledAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
  studentName: string;
  examinerName: string;
  examinerTitle: string;
  sessionCode: string | null;
  roomName: string;
  livekitConfigured: boolean;
  recordingEnabled: boolean;
  recordingActive: boolean;
  recordingUrl: string | null;
  joinAllowed?: boolean;
  joinOpensAt?: string | null;
  joinClosesAt?: string | null;
  joinMessage?: string | null;
  enrollmentId?: string;
  adminGranted?: boolean;
  mockDate?: string;
  speakingTeacherId?: string | null;
  needsSpeakingSlot?: boolean;
  slotLocked?: boolean;
};

export type SpeakingJoinResponse = {
  token: string;
  serverUrl: string;
  roomName: string;
  role: "examiner" | "student" | "admin";
  speakingSessionId: string;
  livekitConfigured: boolean;
  recordingEnabled: boolean;
};

export function getStudentSpeakingState(sessionCode: string) {
  return apiFetch<SpeakingState>(`/exam-sessions/${sessionCode}/speaking`);
}

export function getSpeakingState(speakingSessionId: string) {
  return apiFetch<SpeakingState>(`/speaking-sessions/${speakingSessionId}/state`);
}

export function joinSpeakingSession(speakingSessionId: string) {
  return apiFetch<SpeakingJoinResponse>(
    `/speaking-sessions/${speakingSessionId}/join`,
    { method: "POST" },
  );
}

export function updateSpeakingState(
  speakingSessionId: string,
  body: {
    activePhase?: SpeakingPhase;
    examinerReady?: boolean;
    endSession?: boolean;
  },
) {
  return apiFetch<SpeakingState>(`/speaking-sessions/${speakingSessionId}/state`, {
    method: "PATCH",
    body,
  });
}

export function getSpeakingExaminerContent(speakingSessionId: string) {
  return apiFetch<{
    bankId: string;
    code: string;
    title: string;
    packageTitle: string;
    content: import("@/lib/exam/types").SpeakingContent;
  }>(`/speaking-sessions/${speakingSessionId}/content`);
}
