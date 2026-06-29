import {
  findExclusiveContentConflicts,
  formatExclusiveContentConflict,
} from './package-content-verify';
import { ExamSkill } from '@prisma/client';

describe('package-content-verify', () => {
  it('flags duplicate exclusive assignments on active packages', () => {
    const conflicts = findExclusiveContentConflicts([
      {
        packageSlug: 'mock-a',
        packageActive: true,
        skill: ExamSkill.LISTENING,
        testId: 'test-1',
      },
      {
        packageSlug: 'mock-b',
        packageActive: true,
        skill: ExamSkill.LISTENING,
        testId: 'test-1',
      },
    ]);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]?.packages).toEqual(['mock-a', 'mock-b']);
    expect(formatExclusiveContentConflict(conflicts[0]!)).toContain('mock-a');
  });

  it('ignores archived packages and speaking banks', () => {
    expect(
      findExclusiveContentConflicts([
        {
          packageSlug: 'archived',
          packageActive: false,
          skill: ExamSkill.LISTENING,
          testId: 'test-1',
        },
        {
          packageSlug: 'active',
          packageActive: true,
          skill: ExamSkill.LISTENING,
          testId: 'test-1',
        },
        {
          packageSlug: 'other',
          packageActive: true,
          skill: ExamSkill.SPEAKING,
          testId: 'bank-1',
        },
      ]),
    ).toHaveLength(0);
  });
});
