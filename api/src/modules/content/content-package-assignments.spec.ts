import { ExamSkill } from '@prisma/client';
import {
  groupAssignmentsByTestId,
  summarizeAssignmentsForTest,
  type ContentTestPackageAssignment,
} from './content-package-assignments';

describe('content-package-assignments', () => {
  const speakingShared: ContentTestPackageAssignment[] = [
    {
      testId: 'bank-1',
      packageId: 'pkg-a',
      packageTitle: 'Full Mock A',
      mockLabel: 'Full Mock 001',
      skill: ExamSkill.SPEAKING,
      isActive: true,
    },
    {
      testId: 'bank-1',
      packageId: 'pkg-b',
      packageTitle: 'Full Mock B',
      mockLabel: 'Full Mock 002',
      skill: ExamSkill.SPEAKING,
      isActive: true,
    },
  ];

  it('groups assignments by test id', () => {
    const grouped = groupAssignmentsByTestId(speakingShared);
    expect(grouped.get('bank-1')).toHaveLength(2);
  });

  it('summarizes multiple package links for reusable speaking banks', () => {
    const summary = summarizeAssignmentsForTest(speakingShared);
    expect(summary.linkedPackages).toBe(2);
    expect(summary.activePackageLinks).toBe(2);
    expect(summary.assignedMockLabel).toBe('2 packages');
    expect(summary.assignedMockLabels).toEqual(['Full Mock 001', 'Full Mock 002']);
    expect(summary.isPackaged).toBe(true);
  });

  it('counts active package links separately from archived packages', () => {
    const summary = summarizeAssignmentsForTest([
      ...speakingShared,
      {
        testId: 'bank-1',
        packageId: 'pkg-old',
        packageTitle: 'Old Mock',
        mockLabel: 'Full Mock 000',
        skill: ExamSkill.SPEAKING,
        isActive: false,
      },
    ]);
    expect(summary.linkedPackages).toBe(3);
    expect(summary.activePackageLinks).toBe(2);
  });
});
