import { ExamSessionState, ExamSkill } from '@prisma/client';
import {
  expectedNextSkillToStart,
  nextStateAfterSubmit,
  orderedPackageSkills,
} from './exam-state-machine';

const FULL = [
  ExamSkill.LISTENING,
  ExamSkill.READING,
  ExamSkill.WRITING,
  ExamSkill.SPEAKING,
];

describe('orderedPackageSkills', () => {
  it('orders an arbitrary subset into canonical exam-day order', () => {
    expect(orderedPackageSkills([ExamSkill.SPEAKING, ExamSkill.LISTENING])).toEqual(
      [ExamSkill.LISTENING, ExamSkill.SPEAKING],
    );
  });
});

describe('nextStateAfterSubmit (package-aware)', () => {
  it('full mock: listening submit waits in LISTENING_SUBMITTED', () => {
    expect(nextStateAfterSubmit(FULL, ExamSkill.LISTENING)).toBe(
      ExamSessionState.LISTENING_SUBMITTED,
    );
  });

  it('full mock: writing submit schedules speaking', () => {
    expect(nextStateAfterSubmit(FULL, ExamSkill.WRITING)).toBe(
      ExamSessionState.SPEAKING_SCHEDULED,
    );
  });

  it('full mock: speaking submit awaits grading', () => {
    expect(nextStateAfterSubmit(FULL, ExamSkill.SPEAKING)).toBe(
      ExamSessionState.AWAITING_GRADING,
    );
  });

  it('listening-only: submit goes straight to grading', () => {
    expect(nextStateAfterSubmit([ExamSkill.LISTENING], ExamSkill.LISTENING)).toBe(
      ExamSessionState.AWAITING_GRADING,
    );
  });

  it('writing-only: submit goes straight to grading', () => {
    expect(nextStateAfterSubmit([ExamSkill.WRITING], ExamSkill.WRITING)).toBe(
      ExamSessionState.AWAITING_GRADING,
    );
  });

  it('listening + writing: listening submit rests, writing submit grades', () => {
    const skills = [ExamSkill.LISTENING, ExamSkill.WRITING];
    expect(nextStateAfterSubmit(skills, ExamSkill.LISTENING)).toBe(
      ExamSessionState.LISTENING_SUBMITTED,
    );
    expect(nextStateAfterSubmit(skills, ExamSkill.WRITING)).toBe(
      ExamSessionState.AWAITING_GRADING,
    );
  });
});

describe('expectedNextSkillToStart', () => {
  it('starts the first package skill from check-in', () => {
    expect(
      expectedNextSkillToStart(ExamSessionState.CHECK_IN_OPEN, [ExamSkill.WRITING]),
    ).toBe(ExamSkill.WRITING);
  });

  it('advances to the next skill after a submitted state', () => {
    expect(
      expectedNextSkillToStart(ExamSessionState.LISTENING_SUBMITTED, [
        ExamSkill.LISTENING,
        ExamSkill.WRITING,
      ]),
    ).toBe(ExamSkill.WRITING);
  });

  it('returns speaking from scheduled state', () => {
    expect(
      expectedNextSkillToStart(ExamSessionState.SPEAKING_SCHEDULED, FULL),
    ).toBe(ExamSkill.SPEAKING);
  });
});
