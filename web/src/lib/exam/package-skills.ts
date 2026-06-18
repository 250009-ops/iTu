import type { ExamSkill } from "@/lib/exam/types";

export const EXAM_SKILL_ORDER: ExamSkill[] = [
  "listening",
  "reading",
  "writing",
  "speaking",
];

/** Normalize package `skills` JSON into exam-day order. */
export function packageExamSkills(skills: unknown): ExamSkill[] {
  if (!Array.isArray(skills)) return [];
  const want = new Set(
    skills.map((s) => String(s).toLowerCase()).filter(isExamSkill),
  );
  return EXAM_SKILL_ORDER.filter((skill) => want.has(skill));
}

function isExamSkill(value: string): value is ExamSkill {
  return (EXAM_SKILL_ORDER as string[]).includes(value);
}

export function firstPackageExamSkill(skills: unknown): ExamSkill {
  return packageExamSkills(skills)[0] ?? "listening";
}

export function examSkillPath(skill: ExamSkill): string {
  return skill === "speaking" ? "speaking" : skill;
}

export function checkInDestination(skills: unknown): string {
  const first = firstPackageExamSkill(skills);
  if (first === "speaking") return "speaking";
  return first;
}

/** Next skill in this package after `current`, or null when `current` is last. */
export function nextExamSkill(
  skills: unknown,
  current: ExamSkill,
): ExamSkill | null {
  const ordered = packageExamSkills(skills);
  const idx = ordered.indexOf(current);
  if (idx < 0) return null;
  return ordered[idx + 1] ?? null;
}

/**
 * Computes where to navigate after submitting `current`, honoring the package's
 * actual skill set (supports section-only and arbitrary skill subsets).
 */
export function examRouteAfterSection(
  sessionId: string,
  skills: unknown,
  current: ExamSkill,
): string {
  const next = nextExamSkill(skills, current);
  if (!next) {
    // No further sections in this package. If speaking remains it is handled
    // above; otherwise the mock is finished and results will be released.
    return current === "speaking"
      ? `/exam/${sessionId}/waiting-speaking`
      : `/mock-day`;
  }
  if (next === "speaking") {
    return `/exam/${sessionId}/waiting-speaking`;
  }
  return `/exam/${sessionId}/break?from=${current}&next=${next}`;
}
