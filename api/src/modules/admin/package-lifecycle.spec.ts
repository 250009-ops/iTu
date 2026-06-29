import {
  ACTIVE_PACKAGE_ENROLLMENT_STATUSES,
  activeEnrollmentsBlockContentRelease,
  EXCLUSIVE_PACKAGE_SKILLS,
} from './package-lifecycle';
import { EnrollmentStatus, ExamSkill } from '@prisma/client';

describe('package-lifecycle', () => {
  it('defines active enrollment statuses as enrolled and in-progress only', () => {
    expect(ACTIVE_PACKAGE_ENROLLMENT_STATUSES).toEqual([
      EnrollmentStatus.ENROLLED,
      EnrollmentStatus.IN_PROGRESS,
    ]);
  });

  it('blocks content release when active enrollments exist', () => {
    expect(activeEnrollmentsBlockContentRelease(0)).toBe(false);
    expect(activeEnrollmentsBlockContentRelease(1)).toBe(true);
  });

  it('treats listening, reading and writing as exclusive skills', () => {
    expect(EXCLUSIVE_PACKAGE_SKILLS).toEqual([
      ExamSkill.LISTENING,
      ExamSkill.READING,
      ExamSkill.WRITING,
    ]);
    expect(EXCLUSIVE_PACKAGE_SKILLS).not.toContain(ExamSkill.SPEAKING);
  });
});
