import { apiFetch } from "./client";

export type InstExaminerStudent = {
  id: string;
  name: string;
  targetBand: number | null;
  nextMockDate: string | null;
  latestBand: number | null;
  delta: number | null;
};

export type InstExaminerTodaySpeaking = {
  id: string;
  studentName: string;
  scheduledAt: string | null;
  enrollmentCode: string | null;
  graded: boolean;
  band: number | null;
  uiStatus:
    | "upcoming"
    | "live"
    | "awaiting_grade"
    | "graded"
    | "no_show"
    | "cancelled";
};

export type InstExaminerWritingItem = {
  id: string;
  studentName: string;
  examType: string;
  taskLabel: string;
  submittedAt: string;
  wordCount: number;
  priority: "urgent" | "normal";
  aiEstimate: number | null;
  readyToGrade: boolean;
};

export type InstExaminerRecentGrade = {
  id: string;
  studentName: string;
  type: "writing" | "speaking";
  band: number;
  gradedAt: string;
  writingSubmissionId?: string | null;
  speakingSessionId?: string | null;
};

export type InstExaminerOverview = {
  center: { id: string; name: string } | null;
  examiner: { name: string; rating: number | null; totalSessions: number };
  stats: {
    sessionsToday: number;
    sessionsCompletedToday: number;
    writingQueue: number;
    centreStudents: number;
    activeMocks: number;
    avgBandGiven: number | null;
    avgBandDelta: number | null;
  };
  todaySpeaking: InstExaminerTodaySpeaking[];
  writingQueue: InstExaminerWritingItem[];
  recentlyGraded: InstExaminerRecentGrade[];
  students: InstExaminerStudent[];
};

export function getInstExaminerOverview() {
  return apiFetch<InstExaminerOverview>("/inst-examiner/overview");
}
