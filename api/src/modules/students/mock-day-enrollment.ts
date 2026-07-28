import { EnrollmentStatus, ExamSkill, ExamSessionState } from '@prisma/client';
import {
  EXAM_SKILL_ORDER,
  packageExamSkills,
} from '../content/package-skills';

type SectionAttemptLike = { startedAt: Date | null };
type ExamSessionLike = {
  state: ExamSessionState;
  sectionAttempts: SectionAttemptLike[];
  updatedAt?: Date;
};

type PackageLike = { skills: unknown; title?: string };

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

export function isSameMockDay(a: Date, b: Date): boolean {
  return startOfDay(new Date(a)).getTime() === startOfDay(new Date(b)).getTime();
}

/**
 * Pick which active enrollment powers the Mock Day hub when a student has several.
 * Prefers sessions with started sections, then upcoming mocks (more skills first),
 * then the most capable incomplete past mock.
 * Same-calendar-day skill-only purchases are merged later via collectSameDayEnrollments.
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
      const byDate =
        new Date(a.mockDate).getTime() - new Date(b.mockDate).getTime();
      if (byDate !== 0) return byDate;
      // Prefer CBT packages over speaking-only when dates tie so the hub
      // primary is the written exam; speaking still merges in via same-day.
      const aSpeakingOnly =
        skillCount(a.package) === 1 &&
        packageExamSkills(a.package.skills)[0] === ExamSkill.SPEAKING;
      const bSpeakingOnly =
        skillCount(b.package) === 1 &&
        packageExamSkills(b.package.skills)[0] === ExamSkill.SPEAKING;
      if (aSpeakingOnly !== bSpeakingOnly) return aSpeakingOnly ? 1 : -1;
      return 0;
    })[0]!;
  }

  return [...candidates].sort((a, b) => {
    const bySkills = skillCount(b.package) - skillCount(a.package);
    if (bySkills !== 0) return bySkills;
    return new Date(b.mockDate).getTime() - new Date(a.mockDate).getTime();
  })[0]!;
}

/** Active enrollments sharing the primary's mock calendar day. */
export function collectSameDayEnrollments<T extends MockDayEnrollmentCandidate>(
  primary: T,
  enrollments: T[],
): T[] {
  return enrollments.filter(
    (e) =>
      e.examSession != null && isSameMockDay(e.mockDate, primary.mockDate),
  );
}

/**
 * Map each exam skill to the enrollment that owns it on a mock day.
 * When skills overlap (e.g. Full Mock + Speaking Only), the larger package wins.
 */
export function buildSkillOwners<T extends MockDayEnrollmentCandidate>(
  dayGroup: T[],
): Map<ExamSkill, T> {
  const sorted = [...dayGroup].sort(
    (a, b) => skillCount(b.package) - skillCount(a.package),
  );
  const owners = new Map<ExamSkill, T>();
  for (const enrollment of sorted) {
    for (const skill of packageExamSkills(enrollment.package.skills)) {
      if (!owners.has(skill)) owners.set(skill, enrollment);
    }
  }
  return owners;
}

export function orderedSkillsFromOwners(
  owners: Map<ExamSkill, MockDayEnrollmentCandidate>,
): ExamSkill[] {
  return EXAM_SKILL_ORDER.filter((skill) => owners.has(skill));
}

export function combinedPackageTitle(
  dayGroup: Array<MockDayEnrollmentCandidate & { package: PackageLike }>,
  fallback = 'Mock Exam',
): string {
  const titles: string[] = [];
  for (const enrollment of dayGroup) {
    const title = enrollment.package.title?.trim();
    if (title && !titles.includes(title)) titles.push(title);
  }
  if (!titles.length) return fallback;
  if (titles.length === 1) return titles[0]!;
  return titles.join(' + ');
}
