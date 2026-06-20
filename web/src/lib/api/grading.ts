import { apiFetch } from "./client";

export function getWritingQueue() {
  return apiFetch<
    {
      id: string;
      studentName: string;
      date: string;
      slaHours: number;
      urgent: boolean;
      status: string;
      task1WordCount: number;
      task2WordCount: number;
    }[]
  >("/grading/writing-queue");
}

export function getSpeakingQueue() {
  return apiFetch<
    {
      id: string;
      studentName: string;
      date: string;
      status: string;
      scheduledAt: string | null;
    }[]
  >("/grading/speaking-queue");
}

export function getWritingSubmission(id: string) {
  return apiFetch<{
    id: string;
    studentName: string;
    task1Text: string | null;
    task2Text: string | null;
    task1WordCount: number;
    task2WordCount: number;
    status: string;
    grade: {
      criteriaScores: Record<string, number>;
      overallBand: number;
      feedback: string | null;
    } | null;
  }>(`/grading/writing/${id}`);
}

export function scoreWriting(
  id: string,
  body: {
    criteriaScores: Record<string, number>;
    overallBand: number;
    feedback?: string;
  },
) {
  return apiFetch<{ graded: boolean; overallBand: number }>(
    `/grading/writing/${id}/score`,
    { method: "POST", body },
  );
}

export function getSpeakingSession(id: string) {
  return apiFetch<{
    id: string;
    studentName: string;
    status: string;
    scheduledAt: string | null;
    teacherNotes: string | null;
    activePhase?: string;
    examinerReady?: boolean;
    recordingUrl?: string | null;
    grade: {
      criteriaScores: Record<string, number>;
      overallBand: number;
      feedback: string | null;
    } | null;
  }>(`/grading/speaking/${id}`);
}

export function scoreSpeaking(
  id: string,
  body: {
    criteriaScores: Record<string, number>;
    overallBand: number;
    feedback?: string;
    teacherNotes?: string;
  },
) {
  return apiFetch<{ graded: boolean; overallBand: number }>(
    `/grading/speaking/${id}/score`,
    { method: "POST", body },
  );
}
