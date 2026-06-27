import { apiFetch } from "./client";

export function getWritingQueue() {
  return apiFetch<
    {
      id: string;
      studentName: string;
      submittedAt: string;
      task1WordCount: number;
      task2WordCount: number;
      status: string;
      slaMinutesRemaining: number | null;
    grade: {
      criteriaScores: Record<string, unknown>;
      overallBand: number;
      gradedAt: string;
    } | null;
    }[]
  >("/grading/writing-queue");
}

export function getWritingGradingHub() {
  return apiFetch<{
    pending: WritingHubRow[];
    inReview: WritingHubRow[];
    completed: WritingHubRow[];
    counts: { pending: number; inReview: number; completed: number };
    stats: {
      pendingGrading: number;
      onTimeSlaPercent: number;
      overdueCount: number;
      gradedThisPeriod: number;
    };
  }>("/grading/writing-hub");
}

export type WritingHubRow = {
  id: string;
  studentName: string;
  submittedAt: string;
  task1WordCount: number;
  task2WordCount: number;
  status: string;
  slaMinutesRemaining: number | null;
    grade: {
      criteriaScores: Record<string, unknown>;
      overallBand: number;
      gradedAt: string;
    } | null;
};

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
    task1Prompt: string | null;
    task2Prompt: string | null;
    task1VisualCaption: string | null;
    task2VisualCaption: string | null;
    task1WordCount: number;
    task2WordCount: number;
    submittedAt: string;
    slaMinutesRemaining: number | null;
    status: string;
    aiConfigured: boolean;
    grade: {
      criteriaScores: Record<string, unknown>;
      overallBand: number;
      feedback: string | null;
    } | null;
    aiEvaluation: {
      status: string;
      task1Annotations: unknown;
      task2Annotations: unknown;
      task1SuggestedScores: Record<string, number> | null;
      task2SuggestedScores: Record<string, number> | null;
      modelVersion: string | null;
      errorMessage: string | null;
      generatedAt: string | null;
    } | null;
  }>(`/grading/writing/${id}`);
}

export function triggerWritingAiEvaluation(id: string) {
  return apiFetch<{ triggered: boolean; reason?: string }>(
    `/grading/writing/${id}/ai-evaluate`,
    { method: "POST" },
  );
}

export function scoreWriting(
  id: string,
  body: {
    criteriaScores: {
      task1: Record<string, number | string | undefined>;
      task2: Record<string, number | string | undefined>;
    };
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
