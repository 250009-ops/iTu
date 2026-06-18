import { BadRequestException } from '@nestjs/common';
import { ExamSessionState, ExamSkill } from '@prisma/client';

const SKILL_TO_ACTIVE: Record<ExamSkill, ExamSessionState> = {
  LISTENING: ExamSessionState.LISTENING_ACTIVE,
  READING: ExamSessionState.READING_ACTIVE,
  WRITING: ExamSessionState.WRITING_ACTIVE,
  SPEAKING: ExamSessionState.SPEAKING_ACTIVE,
};

const SKILL_TO_SUBMITTED: Record<ExamSkill, ExamSessionState> = {
  LISTENING: ExamSessionState.LISTENING_SUBMITTED,
  READING: ExamSessionState.READING_SUBMITTED,
  WRITING: ExamSessionState.WRITING_SUBMITTED,
  SPEAKING: ExamSessionState.SPEAKING_SUBMITTED,
};

/** Canonical exam-day order; packages run a subset in this order. */
export const SKILL_ORDER: ExamSkill[] = [
  ExamSkill.LISTENING,
  ExamSkill.READING,
  ExamSkill.WRITING,
  ExamSkill.SPEAKING,
];

const VALID_TRANSITIONS: Record<ExamSessionState, ExamSessionState[]> = {
  [ExamSessionState.ENROLLED]: [ExamSessionState.CHECK_IN_OPEN],
  [ExamSessionState.CHECK_IN_OPEN]: [ExamSessionState.LISTENING_ACTIVE],
  [ExamSessionState.LISTENING_ACTIVE]: [ExamSessionState.LISTENING_SUBMITTED],
  [ExamSessionState.LISTENING_SUBMITTED]: [ExamSessionState.READING_ACTIVE],
  [ExamSessionState.READING_ACTIVE]: [ExamSessionState.READING_SUBMITTED],
  [ExamSessionState.READING_SUBMITTED]: [
    ExamSessionState.BREAK,
    ExamSessionState.WRITING_ACTIVE,
  ],
  [ExamSessionState.BREAK]: [ExamSessionState.WRITING_ACTIVE],
  [ExamSessionState.WRITING_ACTIVE]: [ExamSessionState.WRITING_SUBMITTED],
  [ExamSessionState.WRITING_SUBMITTED]: [ExamSessionState.SPEAKING_SCHEDULED],
  [ExamSessionState.SPEAKING_SCHEDULED]: [ExamSessionState.SPEAKING_ACTIVE],
  [ExamSessionState.SPEAKING_ACTIVE]: [ExamSessionState.SPEAKING_SUBMITTED],
  [ExamSessionState.SPEAKING_SUBMITTED]: [ExamSessionState.AWAITING_GRADING],
  [ExamSessionState.AWAITING_GRADING]: [ExamSessionState.RESULTS_RELEASED],
  [ExamSessionState.RESULTS_RELEASED]: [],
};

export const SECTION_DURATIONS_SEC: Record<ExamSkill, number> = {
  LISTENING: 40 * 60,
  READING: 60 * 60,
  WRITING: 60 * 60,
  SPEAKING: 15 * 60,
};

/** Package skills filtered into canonical exam-day order. */
export function orderedPackageSkills(skills: ExamSkill[]): ExamSkill[] {
  const set = new Set(skills);
  return SKILL_ORDER.filter((s) => set.has(s));
}

export function assertTransition(
  current: ExamSessionState,
  next: ExamSessionState,
): void {
  const allowed = VALID_TRANSITIONS[current] ?? [];
  if (!allowed.includes(next)) {
    throw new BadRequestException(
      `Cannot transition from ${current} to ${next}`,
    );
  }
}

export function getActiveStateForSkill(skill: ExamSkill): ExamSessionState {
  return SKILL_TO_ACTIVE[skill];
}

export function getSubmittedStateForSkill(skill: ExamSkill): ExamSessionState {
  return SKILL_TO_SUBMITTED[skill];
}

export function skillForActiveState(state: ExamSessionState): ExamSkill | null {
  const entry = Object.entries(SKILL_TO_ACTIVE).find(([, s]) => s === state);
  return entry ? (entry[0] as ExamSkill) : null;
}

/** The skill a student is expected to start next, given current state + package. */
export function expectedNextSkillToStart(
  current: ExamSessionState,
  skills: ExamSkill[],
): ExamSkill | null {
  const ordered = orderedPackageSkills(skills);
  if (ordered.length === 0) return null;

  if (
    current === ExamSessionState.CHECK_IN_OPEN ||
    current === ExamSessionState.ENROLLED
  ) {
    return ordered[0] ?? null;
  }

  if (current === ExamSessionState.SPEAKING_SCHEDULED) {
    return ExamSkill.SPEAKING;
  }

  if (current === ExamSessionState.BREAK) {
    // Break sits between the last-submitted CBT skill and the next one.
    return ordered.find((s) => s === ExamSkill.WRITING) ?? null;
  }

  // Find the skill whose SUBMITTED state matches `current`, return the next one.
  const submittedSkill = (
    Object.entries(SKILL_TO_SUBMITTED) as [ExamSkill, ExamSessionState][]
  ).find(([, st]) => st === current)?.[0];
  if (submittedSkill) {
    const idx = ordered.indexOf(submittedSkill);
    return ordered[idx + 1] ?? null;
  }

  return null;
}

/**
 * Package-aware validation for starting a section. Ensures the skill being
 * started is the next expected skill in the package's ordered skill list.
 */
export function assertStartTransition(
  current: ExamSessionState,
  skill: ExamSkill,
  skills: ExamSkill[],
): void {
  const expected = expectedNextSkillToStart(current, skills);
  if (expected !== skill) {
    throw new BadRequestException(
      `Cannot start ${skill} from state ${current}` +
        (expected ? ` (expected ${expected})` : ''),
    );
  }
}

/**
 * Package-aware next state after submitting a skill.
 * - If a next skill exists and it is SPEAKING → SPEAKING_SCHEDULED.
 * - If a next CBT skill exists → that skill's SUBMITTED resting state.
 * - If no next skill (last in package) → AWAITING_GRADING.
 */
export function nextStateAfterSubmit(
  skills: ExamSkill[],
  skill: ExamSkill,
): ExamSessionState {
  const ordered = orderedPackageSkills(skills);
  const idx = ordered.indexOf(skill);
  const next = ordered[idx + 1];

  if (!next) return ExamSessionState.AWAITING_GRADING;
  if (next === ExamSkill.SPEAKING) return ExamSessionState.SPEAKING_SCHEDULED;
  return SKILL_TO_SUBMITTED[skill];
}
