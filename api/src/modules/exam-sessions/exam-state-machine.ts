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
