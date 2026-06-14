import type { ExamSkill } from "@/lib/exam/types";
import { apiFetch } from "./client";

export type ExamSessionResponse = {
  id: string;
  sessionCode: string;
  state: string;
  integrity: string;
  checkInAt: string | null;
  sectionTimers: Record<string, unknown>;
  enrollment: {
    id: string;
    enrollmentCode: string;
    mockDate: string;
    status: string;
    resultsStatus: string;
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
  remainingSec: number;
  serverTime: string;
  expired?: boolean;
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

export function getTimer(sessionCode: string) {
  return apiFetch<ExamTimerResponse>(`/exam-sessions/${sessionCode}/timer`);
}

export function logIntegrity(
  sessionCode: string,
  event: string,
  metadata?: Record<string, unknown>,
) {
  return apiFetch<{ logged: boolean }>(
    `/exam-sessions/${sessionCode}/integrity`,
    { method: "POST", body: { event, metadata } },
  );
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
