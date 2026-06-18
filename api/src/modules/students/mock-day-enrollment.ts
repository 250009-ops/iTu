import { EnrollmentStatus, ExamSessionState } from '@prisma/client';
import { packageExamSkills } from '../content/package-skills';

type SectionAttemptLike = { startedAt: Date | null };
type ExamSessionLike = {
  state: ExamSessionState;
  sectionAttempts: SectionAttemptLike[];
  updatedAt?: Date;
};

type PackageLike = { skills: unknown };

export type MockDayEnrollmentCandidate = {
  mockDate: Date;
  status: EnrollmentStatus;
  package: PackageLike;
  examSession: ExamSessionLike | null;
};

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function hasStartedSections(session: ExamSessionLike): boolean {
  return session.sectionAttempts.some((a) => a.startedAt != null);
}

function skillCount(pkg: PackageLike): number {
  return packageExamSkills(pkg.skills).length;
}

/**
 * Pick which active enrollment powers the Mock Day hub when a student has several.
 * Prefers sessions with started sections, then upcoming mocks (more skills first),
 * then the most capable incomplete past mock.
 */
export function selectMockDayEnrollment<T extends MockDayEnrollmentCandidate>(
  enrollments: T[],
): T | null {
  const candidates = enrollments.filter((e) => e.examSession);
  if (!candidates.length) return null;

  const today = startOfDay(new Date());

  const activelyExamining = candidates.filter((e) =>
    hasStartedSections(e.examSession!),
  );
  if (activelyExamining.length === 1) return activelyExamining[0]!;
  if (activelyExamining.length > 1) {
    return [...activelyExamining].sort(
      (a, b) =>
        (b.examSession!.updatedAt?.getTime() ?? 0) -
        (a.examSession!.updatedAt?.getTime() ?? 0),
    )[0]!;
  }

  const upcoming = candidates.filter(
    (e) => startOfDay(new Date(e.mockDate)) >= today,
  );
  if (upcoming.length) {
    return [...upcoming].sort((a, b) => {
      const bySkills = skillCount(b.package) - skillCount(a.package);
      if (bySkills !== 0) return bySkills;
      return new Date(a.mockDate).getTime() - new Date(b.mockDate).getTime();
    })[0]!;
  }

  return [...candidates].sort((a, b) => {
    const bySkills = skillCount(b.package) - skillCount(a.package);
    if (bySkills !== 0) return bySkills;
    return new Date(b.mockDate).getTime() - new Date(a.mockDate).getTime();
  })[0]!;
}
