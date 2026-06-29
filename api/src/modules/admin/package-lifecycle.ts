import { BadRequestException } from '@nestjs/common';
import { EnrollmentStatus, ExamSkill } from '@prisma/client';

/** Statuses that mean a student may still start or continue this package's exam. */
export const ACTIVE_PACKAGE_ENROLLMENT_STATUSES = [
  EnrollmentStatus.ENROLLED,
  EnrollmentStatus.IN_PROGRESS,
] as const;

export function activeEnrollmentsBlockContentRelease(activeCount: number): boolean {
  return activeCount > 0;
}

export const EXCLUSIVE_PACKAGE_SKILLS = [
  ExamSkill.LISTENING,
  ExamSkill.READING,
  ExamSkill.WRITING,
] as const;
