import type { ExamSkill } from "@/lib/exam/types";

/** Demo session identifier used for prototype exam links. */
export const EXAM_SESSION_ID = "MOCK-005";

export const SKILL_ORDER: ExamSkill[] = [
  "listening",
  "reading",
  "writing",
  "speaking",
];

export function examHref(
  segment: ExamSkill | "check-in" | "break" | "waiting-speaking",
  sessionId: string = EXAM_SESSION_ID,
): string {
  return `/exam/${sessionId}/${segment}`;
}
