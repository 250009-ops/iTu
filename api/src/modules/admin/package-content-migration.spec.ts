import {
  detectExclusiveAssignmentConflict,
  formatExclusiveAssignmentConflict,
} from './package-content-migration';

describe('package-content-migration', () => {
  it('detects duplicate exclusive test assignment', () => {
    const assigned = new Map([
      ['test-a', { slug: 'full-mock-001', skill: 'LISTENING' }],
    ]);
    const conflict = detectExclusiveAssignmentConflict(
      assigned,
      'full-mock-002',
      'LISTENING',
      'test-a',
    );
    expect(conflict).toEqual({
      skill: 'LISTENING',
      testId: 'test-a',
      packageSlug: 'full-mock-002',
      ownerSlug: 'full-mock-001',
      ownerSkill: 'LISTENING',
    });
    expect(formatExclusiveAssignmentConflict(conflict!)).toContain('full-mock-002');
  });

  it('returns null when test is not yet assigned', () => {
    const assigned = new Map<string, { slug: string; skill: string }>();
    expect(
      detectExclusiveAssignmentConflict(assigned, 'pkg-b', 'READING', 'test-x'),
    ).toBeNull();
  });
});
