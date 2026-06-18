import {
  ContentTestStatus,
  ExamSkill,
  Prisma,
  PrismaClient,
} from '@prisma/client';
import { packageExamSkills } from './package-skills';

const SKILL_TYPE = {
  LISTENING: 'LISTENING',
  READING: 'READING',
  WRITING: 'WRITING',
  SPEAKING: 'SPEAKING',
} as const;

const SKILL_FIELD: Record<
  ExamSkill,
  'listeningTestId' | 'readingTestId' | 'writingTestId' | 'speakingBankId'
> = {
  LISTENING: 'listeningTestId',
  READING: 'readingTestId',
  WRITING: 'writingTestId',
  SPEAKING: 'speakingBankId',
};

type Tx = Prisma.TransactionClient | PrismaClient;

type PackageForAssignment = {
  id: string;
  skills: unknown;
  listeningTestId: string | null;
  readingTestId: string | null;
  writingTestId: string | null;
  speakingBankId: string | null;
};

/**
 * Returns the ordered list of eligible published test ids for a package + skill.
 * Priority: the package content pool; otherwise the explicit FK; otherwise all
 * published tests of that type (legacy fallback).
 */
async function eligibleTestIds(
  tx: Tx,
  pkg: PackageForAssignment,
  skill: ExamSkill,
): Promise<string[]> {
  const pool = await tx.packageContentTest.findMany({
    where: {
      packageId: pkg.id,
      skill,
      test: { status: ContentTestStatus.PUBLISHED },
    },
    select: { testId: true, test: { select: { updatedAt: true } } },
    orderBy: { createdAt: 'asc' },
  });
  if (pool.length > 0) {
    return pool.map((p) => p.testId);
  }

  const explicit = pkg[SKILL_FIELD[skill]];
  if (explicit) {
    const linked = await tx.contentTest.findUnique({
      where: { id: explicit },
      select: { id: true, status: true },
    });
    if (linked?.status === ContentTestStatus.PUBLISHED) {
      return [linked.id];
    }
  }

  const all = await tx.contentTest.findMany({
    where: {
      type: SKILL_TYPE[skill],
      status: ContentTestStatus.PUBLISHED,
    },
    orderBy: { updatedAt: 'desc' },
    select: { id: true },
  });
  return all.map((t) => t.id);
}

/** Test ids this student has already been assigned for a skill (most recent first). */
async function takenTestIds(
  tx: Tx,
  studentId: string,
  skill: ExamSkill,
): Promise<string[]> {
  const attempts = await tx.sectionAttempt.findMany({
    where: {
      skill,
      contentTestId: { not: null },
      session: { enrollment: { studentId } },
    },
    select: { contentTestId: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
  return attempts
    .map((a) => a.contentTestId)
    .filter((id): id is string => id != null);
}

export type SkillAssignment = {
  skill: ExamSkill;
  testId: string | null;
  /** True when every eligible test had already been taken (pool exhausted). */
  recycled: boolean;
};

/**
 * Picks a content test per package skill for a new enrollment, preferring tests
 * the student has never seen. When the pool is exhausted it recycles the
 * least-recently-taken test rather than failing.
 */
export async function assignContentTests(
  tx: Tx,
  studentId: string,
  pkg: PackageForAssignment,
): Promise<SkillAssignment[]> {
  const skills = packageExamSkills(pkg.skills);
  const assignments: SkillAssignment[] = [];

  for (const skill of skills) {
    const eligible = await eligibleTestIds(tx, pkg, skill);
    if (eligible.length === 0) {
      assignments.push({ skill, testId: null, recycled: false });
      continue;
    }

    const taken = await takenTestIds(tx, studentId, skill);
    const takenSet = new Set(taken);
    const unseen = eligible.filter((id) => !takenSet.has(id));

    if (unseen.length > 0) {
      assignments.push({ skill, testId: unseen[0]!, recycled: false });
      continue;
    }

    // Exhausted: recycle the test taken longest ago (last in most-recent list)
    // that is still eligible.
    const recycleOrder = [...taken].reverse();
    const recycled =
      recycleOrder.find((id) => eligible.includes(id)) ?? eligible[0]!;
    assignments.push({ skill, testId: recycled, recycled: true });
  }

  return assignments;
}

/**
 * How many unique eligible tests remain unseen for a student on a package.
 * Used to surface re-purchase guidance ("X of Y unique tests remaining").
 */
export async function remainingUniqueAttempts(
  tx: Tx,
  studentId: string,
  pkg: PackageForAssignment,
): Promise<{ skill: ExamSkill; total: number; remaining: number }[]> {
  const skills = packageExamSkills(pkg.skills);
  const result: { skill: ExamSkill; total: number; remaining: number }[] = [];

  for (const skill of skills) {
    const eligible = await eligibleTestIds(tx, pkg, skill);
    const taken = new Set(await takenTestIds(tx, studentId, skill));
    const remaining = eligible.filter((id) => !taken.has(id)).length;
    result.push({ skill, total: eligible.length, remaining });
  }

  return result;
}
