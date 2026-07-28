import type { ExamSkill } from "@/lib/exam/types";
import { apiFetch } from "./client";

export type ExamSessionResponse = {
  id: string;
  sessionCode: string;
  state: string;
  integrity: string;
  checkInAt: string | null;
  suspendedAt?: string | null;
  suspendReason?: string | null;
  sectionTimers: Record<string, unknown>;
  enrollment: {
    id: string;
    enrollmentCode: string;
    mockDate: string;
    status: string;
    resultsStatus: string;
    institutionGranted?: boolean;
    package: {
      slug: string;
      title: string;
      skills: unknown;
    };
  };
  sections: {
    skill: string;
    startedAt: string | null;
    submittedAt: string | null;
    rawScore: number | null;
    band: number | null;
    timeRemaining: number | null;
  }[];
};

export type ExamTimerResponse = {
  skill: string | null;
  remainingSec: number | null;
  serverTime: string;
  expired?: boolean;
  notStarted?: boolean;
  paused?: boolean;
  suspended?: boolean;
};

export type ExamProgressResponse = {
  skill: string | null;
  suspended: boolean;
  suspendReason: string | null;
  answers: Record<string, string | string[] | null>;
  writing: { task1Text: string; task2Text: string } | null;
  clientState: unknown;
};

export function getExamSession(sessionCode: string) {
  return apiFetch<ExamSessionResponse>(`/exam-sessions/${sessionCode}`);
}

export function checkIn(sessionCode: string) {
  return apiFetch<ExamSessionResponse>(`/exam-sessions/${sessionCode}/check-in`, {
    method: "POST",
    body: { acknowledgedRules: true },
  });
}

export function startSection(sessionCode: string, skill: ExamSkill) {
  return apiFetch<ExamSessionResponse>(
    `/exam-sessions/${sessionCode}/start-section`,
    { method: "POST", body: { skill: skill.toUpperCase() } },
  );
}

export function saveAnswers(
  sessionCode: string,
  answers: Record<string, string | string[] | null>,
) {
  return apiFetch<{ saved: number; skill: string }>(
    `/exam-sessions/${sessionCode}/answers`,
    { method: "POST", body: { answers } },
  );
}

export function submitSection(sessionCode: string, skill: ExamSkill) {
  return apiFetch<ExamSessionResponse>(
    `/exam-sessions/${sessionCode}/submit-section`,
    { method: "POST", body: { skill: skill.toUpperCase() } },
  );
}

export function submitWriting(
  sessionCode: string,
  task1Text: string,
  task2Text: string,
) {
  return apiFetch<{ saved: boolean }>(
    `/exam-sessions/${sessionCode}/submit-writing`,
    { method: "POST", body: { task1Text, task2Text } },
  );
}

export function getExamProgress(sessionCode: string) {
  return apiFetch<ExamProgressResponse>(
    `/exam-sessions/${sessionCode}/progress`,
  );
}

export function sendExamHeartbeat(sessionCode: string) {
  return apiFetch<{
    ok: boolean;
    suspended: boolean;
    remainingSec: number | null;
    paused: boolean;
  }>(`/exam-sessions/${sessionCode}/heartbeat`, { method: "POST" });
}

export function suspendExamSession(sessionCode: string, reason: string) {
  return apiFetch<{ suspended: boolean; reason: string; remainingSec?: number }>(
    `/exam-sessions/${sessionCode}/suspend`,
    { method: "POST", body: { reason } },
  );
}

export function saveExamClientState(
  sessionCode: string,
  clientState: Record<string, unknown>,
) {
  return apiFetch<{ saved: boolean }>(
    `/exam-sessions/${sessionCode}/client-state`,
    { method: "POST", body: { clientState } },
  );
}

export function getTimer(sessionCode: string) {
  return apiFetch<ExamTimerResponse>(`/exam-sessions/${sessionCode}/timer`);
}

export function logIntegrity(
  sessionCode: string,
  event: string,
  metadata?: Record<string, unknown>,
) {
  return apiFetch<{
    logged: boolean;
    integrity?: string;
    offenseCount?: number;
  }>(`/exam-sessions/${sessionCode}/integrity`, {
    method: "POST",
    body: { event, metadata },
  });
}

export function getExamContent(sessionCode: string, skill: ExamSkill) {
  return apiFetch<{
    id: string;
    code: string;
    title: string;
    type: string;
    content: unknown;
    durationMin: number;
  }>(`/exam-sessions/${sessionCode}/content/${skill}`);
}
