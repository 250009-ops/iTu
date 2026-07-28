import { EnrollmentStatus, ExamSessionState, ExamSkill } from '@prisma/client';
import {
  buildSkillOwners,
  collectSameDayEnrollments,
  combinedPackageTitle,
  orderedSkillsFromOwners,
  selectMockDayEnrollment,
} from './mock-day-enrollment';

function candidate(overrides: {
  mockDate: string;
  skills: ExamSkill[];
  title?: string;
  status?: EnrollmentStatus;
  started?: boolean;
  updatedAt?: string;
}) {
  return {
    mockDate: new Date(overrides.mockDate),
    status: overrides.status ?? EnrollmentStatus.ENROLLED,
    package: {
      skills: overrides.skills,
      title: overrides.title ?? overrides.skills.join('+'),
    },
    examSession: {
      state: ExamSessionState.ENROLLED,
      sectionAttempts: overrides.started
        ? [{ startedAt: new Date('2026-07-28T08:00:00') }]
        : [],
      updatedAt: overrides.updatedAt
        ? new Date(overrides.updatedAt)
        : new Date('2026-07-01T00:00:00'),
    },
  };
}

describe('selectMockDayEnrollment', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-07-27T12:00:00'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('prefers the package with more skills on the same upcoming day', () => {
    const reading = candidate({
      mockDate: '2026-07-28',
      skills: [ExamSkill.READING],
    });
    const full = candidate({
      mockDate: '2026-07-28',
      skills: [
        ExamSkill.LISTENING,
        ExamSkill.READING,
        ExamSkill.WRITING,
        ExamSkill.SPEAKING,
      ],
    });
    expect(selectMockDayEnrollment([reading, full])).toBe(full);
  });

  it('prefers CBT over speaking-only when skill counts and dates match', () => {
    const reading = candidate({
      mockDate: '2026-07-28',
      skills: [ExamSkill.READING],
      title: 'Reading Only',
    });
    const speaking = candidate({
      mockDate: '2026-07-28',
      skills: [ExamSkill.SPEAKING],
      title: 'Speaking Only',
    });
    expect(selectMockDayEnrollment([speaking, reading])).toBe(reading);
  });

  it('prefers the earliest upcoming date when skill counts match', () => {
    const reading = candidate({
      mockDate: '2026-07-28',
      skills: [ExamSkill.READING],
    });
    const speaking = candidate({
      mockDate: '2026-08-05',
      skills: [ExamSkill.SPEAKING],
    });
    expect(selectMockDayEnrollment([speaking, reading])).toBe(reading);
  });
});

describe('same-day skill merge helpers', () => {
  it('collects all enrollments on the same calendar day', () => {
    const reading = candidate({
      mockDate: '2026-07-28T00:00:00',
      skills: [ExamSkill.READING],
    });
    const speaking = candidate({
      mockDate: '2026-07-28T00:00:00',
      skills: [ExamSkill.SPEAKING],
    });
    const otherDay = candidate({
      mockDate: '2026-08-05T00:00:00',
      skills: [ExamSkill.WRITING],
    });
    const group = collectSameDayEnrollments(reading, [
      reading,
      speaking,
      otherDay,
    ]);
    expect(group).toHaveLength(2);
    expect(group).toEqual(expect.arrayContaining([reading, speaking]));
  });

  it('unions Reading + Speaking skills for the same day', () => {
    const reading = candidate({
      mockDate: '2026-07-28',
      skills: [ExamSkill.READING],
      title: 'Reading Only',
    });
    const speaking = candidate({
      mockDate: '2026-07-28',
      skills: [ExamSkill.SPEAKING],
      title: 'Speaking Only',
    });
    const owners = buildSkillOwners([reading, speaking]);
    expect(orderedSkillsFromOwners(owners)).toEqual([
      ExamSkill.READING,
      ExamSkill.SPEAKING,
    ]);
    expect(owners.get(ExamSkill.READING)).toBe(reading);
    expect(owners.get(ExamSkill.SPEAKING)).toBe(speaking);
    expect(combinedPackageTitle([reading, speaking])).toBe(
      'Reading Only + Speaking Only',
    );
  });

  it('lets the larger package own overlapping skills', () => {
    const full = candidate({
      mockDate: '2026-07-28',
      skills: [
        ExamSkill.LISTENING,
        ExamSkill.READING,
        ExamSkill.WRITING,
        ExamSkill.SPEAKING,
      ],
      title: 'Full Mock',
    });
    const speakingOnly = candidate({
      mockDate: '2026-07-28',
      skills: [ExamSkill.SPEAKING],
      title: 'Speaking Only',
    });
    const owners = buildSkillOwners([speakingOnly, full]);
    expect(owners.get(ExamSkill.SPEAKING)).toBe(full);
    expect(orderedSkillsFromOwners(owners)).toHaveLength(4);
  });
});
