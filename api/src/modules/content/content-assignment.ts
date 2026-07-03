import {
  ContentTestStatus,
  ExamSkill,
  ExamType,
  Prisma,
  PrismaClient,
} from '@prisma/client';
import { SKILL_TO_TEST_FIELD } from '../../common/package-kind';
import { packageExamSkills } from './package-skills';

type Tx = Prisma.TransactionClient | PrismaClient;

type PackageForAssignment = {
  id: string;
  skills: unknown;
  listeningTestId: string | null;
  readingTestId: string | null;
  writingTestId: string | null;
  speakingBankId: string | null;
};

/** The single pinned test for a package skill (pool entry or legacy FK). */
export async function packageTestIdForSkill(
  tx: Tx,
  pkg: PackageForAssignment,
  skill: ExamSkill,
): Promise<string | null> {
  const pool = await tx.packageContentTest.findFirst({
    where: {
      packageId: pkg.id,
      skill,
      test: { status: ContentTestStatus.PUBLISHED },
    },
    select: { testId: true },
  });
  if (pool) return pool.testId;

  const explicit = pkg[SKILL_TO_TEST_FIELD[skill]];
  if (!explicit) return null;

  const linked = await tx.contentTest.findUnique({
    where: { id: explicit },
    select: { id: true, status: true },
  });
  if (linked?.status === ContentTestStatus.PUBLISHED) {
    return linked.id;
  }
  return null;
}

/** Content test ids this student has finished (submitted section attempts). */
export async function studentFinishedTestIds(
  tx: Tx,
  studentId: string,
): Promise<Set<string>> {
  const attempts = await tx.sectionAttempt.findMany({
    where: {
      contentTestId: { not: null },
      submittedAt: { not: null },
      session: { enrollment: { studentId } },
    },
    select: { contentTestId: true },
  });
  return new Set(
    attempts
      .map((a) => a.contentTestId)
      .filter((id): id is string => id != null),
  );
}

export type SkillAssignment = {
  skill: ExamSkill;
  testId: string | null;
};

export type PackageContentAvailability = {
  skill: ExamSkill;
  testId: string | null;
  testCode: string | null;
  alreadyTaken: boolean;
  canPurchase: boolean;
};

/**
 * Resolves the pinned test per skill for a package. Throws when a required
 * skill has no published test assigned.
 */
export async function assignContentTests(
  tx: Tx,
  _studentId: string,
  pkg: PackageForAssignment,
): Promise<SkillAssignment[]> {
  const skills = packageExamSkills(pkg.skills);
  const assignments: SkillAssignment[] = [];

  for (const skill of skills) {
    const testId = await packageTestIdForSkill(tx, pkg, skill);
    assignments.push({ skill, testId });
  }

  return assignments;
}

/** Whether a student may book this package (no finished overlap, tests assigned). */
export async function evaluatePackageAvailability(
  tx: Tx,
  studentId: string,
  pkg: PackageForAssignment,
  options?: { exceptEnrollmentId?: string },
): Promise<{
  canPurchase: boolean;
  perSkill: PackageContentAvailability[];
  blockingReason: string | null;
}> {
  const skills = packageExamSkills(pkg.skills);
  const finished = await studentFinishedTestIds(tx, studentId);
  const perSkill: PackageContentAvailability[] = [];
  let canPurchase = true;
  let blockingReason: string | null = null;

  for (const skill of skills) {
    const testId = await packageTestIdForSkill(tx, pkg, skill);
    let testCode: string | null = null;
    if (testId) {
      const test = await tx.contentTest.findUnique({
        where: { id: testId },
        select: { code: true },
      });
      testCode = test?.code ?? null;
    }

    const alreadyTaken = testId != null && finished.has(testId);
    // Speaking banks are reusable topic pools shared across packages, so a prior
    // completed speaking session must not block booking another package.
    const blocksOnReuse = skill !== ExamSkill.SPEAKING;
    const skillAvailable = testId != null && (!alreadyTaken || !blocksOnReuse);

    if (testId == null) {
      canPurchase = false;
      if (!blockingReason) {
        blockingReason = `This package is missing a published ${skill.toLowerCase()} test.`;
      }
    } else if (alreadyTaken && blocksOnReuse) {
      canPurchase = false;
      if (!blockingReason) {
        blockingReason = `You have already completed ${testCode ?? 'this test'} and cannot purchase this package again.`;
      }
    }

    perSkill.push({
      skill,
      testId,
      testCode,
      alreadyTaken,
      canPurchase: skillAvailable,
    });
  }

  const priorEnrollment = await tx.enrollment.findFirst({
    where: {
      studentId,
      packageId: pkg.id,
      status: { notIn: ['CANCELLED', 'MISSED'] },
      ...(options?.exceptEnrollmentId
        ? { id: { not: options.exceptEnrollmentId } }
        : {}),
    },
    select: { enrollmentCode: true },
  });
  if (priorEnrollment) {
    canPurchase = false;
    blockingReason =
      blockingReason ??
      `You have already enrolled in this package (${priorEnrollment.enrollmentCode}). Re-purchase is not allowed.`;
  }

  return { canPurchase, perSkill, blockingReason };
}

/** Lowest mockNumber active package this student may still book for a kind. */
export async function resolveNextPackageForStudent(
  tx: Tx,
  studentId: string,
  filters: { packageKind: string; examType?: ExamType },
) {
  const candidates = await tx.mockTestPackage.findMany({
    where: {
      isActive: true,
      packageKind: filters.packageKind,
      ...(filters.examType ? { examType: filters.examType } : {}),
    },
    orderBy: { mockNumber: 'asc' },
  });

  for (const pkg of candidates) {
    const { canPurchase } = await evaluatePackageAvailability(
      tx,
      studentId,
      pkg,
    );
    if (canPurchase) return pkg;
  }
  return null;
}

/** Active packages this student may book (purchase or complimentary grant). */
export async function filterPackagesAvailableToStudent<
  T extends PackageForAssignment,
>(
  tx: Tx,
  studentId: string,
  packages: T[],
  options?: { exceptEnrollmentId?: string },
): Promise<T[]> {
  const available: T[] = [];
  for (const pkg of packages) {
    const { canPurchase } = await evaluatePackageAvailability(
      tx,
      studentId,
      pkg,
      options,
    );
    if (canPurchase) available.push(pkg);
  }
  return available;
}

/** @deprecated Use evaluatePackageAvailability instead. */
export async function remainingUniqueAttempts(
  tx: Tx,
  studentId: string,
  pkg: PackageForAssignment,
): Promise<{ skill: ExamSkill; total: number; remaining: number }[]> {
  const result = await evaluatePackageAvailability(tx, studentId, pkg);
  return result.perSkill.map((s) => ({
    skill: s.skill,
    total: s.testId ? 1 : 0,
    remaining: s.canPurchase ? 1 : 0,
  }));
}
