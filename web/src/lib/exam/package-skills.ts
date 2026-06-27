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
/** Where to send the student when resuming from check-in (or after Begin). */
export function examResumeRoute(
  sessionId: string,
  state: string | undefined,
  skills: unknown,
): string {
  const first = checkInDestination(skills);

  if (!state || state === "enrolled") {
    return `/exam/${sessionId}/${first}`;
  }
  if (state === "check_in_open") {
    return `/exam/${sessionId}/${first}`;
  }

  const activeByState: Record<string, ExamSkill> = {
    listening_active: "listening",
    reading_active: "reading",
    writing_active: "writing",
    speaking_active: "speaking",
  };
  const active = activeByState[state];
  if (active) {
    return `/exam/${sessionId}/${examSkillPath(active)}`;
  }

  if (state === "speaking_scheduled") {
    return `/exam/${sessionId}/waiting-speaking`;
  }

  if (state === "break") {
    const ordered = packageExamSkills(skills);
    const from = ordered[0] ?? "listening";
    const next = nextExamSkill(skills, from);
    if (!next) return `/mock-day`;
    return `/exam/${sessionId}/break?from=${from}&next=${next}`;
  }

  const submittedByState: Record<string, ExamSkill> = {
    listening_submitted: "listening",
    reading_submitted: "reading",
    writing_submitted: "writing",
    speaking_submitted: "speaking",
  };
  const from = submittedByState[state];
  if (from) {
    return examRouteAfterSection(sessionId, skills, from);
  }

  if (state === "awaiting_grading" || state === "results_released") {
    return "/mock-day";
  }

  return `/exam/${sessionId}/${first}`;
}

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

/** Skill whose submission matches a `*_submitted` session state, if any. */
export function skillFromSubmittedState(state: string): ExamSkill | null {
  const map: Record<string, ExamSkill> = {
    listening_submitted: "listening",
    reading_submitted: "reading",
    writing_submitted: "writing",
    speaking_submitted: "speaking",
  };
  return map[state] ?? null;
}

/** Mirrors backend `expectedNextSkillToStart` using lowercase API states. */
export function expectedNextSkillFromSessionState(
  state: string,
  skills: unknown,
): ExamSkill | null {
  const ordered = packageExamSkills(skills);
  if (ordered.length === 0) return null;

  if (state === "check_in_open" || state === "enrolled") {
    return ordered[0] ?? null;
  }
  if (state === "speaking_scheduled") return "speaking";
  if (state === "break") {
    return ordered.find((s) => s === "writing") ?? null;
  }

  const submitted = skillFromSubmittedState(state);
  if (submitted) {
    const idx = ordered.indexOf(submitted);
    return ordered[idx + 1] ?? null;
  }

  const activeByState: Record<string, ExamSkill> = {
    listening_active: "listening",
    reading_active: "reading",
    writing_active: "writing",
    speaking_active: "speaking",
  };
  return activeByState[state] ?? null;
}

export function examBreakRoute(
  sessionId: string,
  from: ExamSkill,
  next: ExamSkill,
): string {
  return `/exam/${sessionId}/break?from=${from}&next=${next}`;
}
