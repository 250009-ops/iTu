import {
  ExamSkill,
  type MockTestPackage,
  PrismaClient,
} from '@prisma/client';
import { packageTestIdForSkill } from './content-assignment';
import { packageIncludesExamSkill } from './package-skills';

type PackageContentFields = Pick<
  MockTestPackage,
  | 'id'
  | 'listeningTestId'
  | 'readingTestId'
  | 'writingTestId'
  | 'speakingBankId'
  | 'skills'
>;

/** True when the package JSON `skills` array includes this exam skill. */
export function packageIncludesSkill(
  skills: unknown,
  skill: ExamSkill,
): boolean {
  return packageIncludesExamSkill(skills, skill);
}

export function explicitPackageContentTestId(
  pkg: Omit<PackageContentFields, 'id'>,
  skill: ExamSkill,
): string | null {
  const field =
    skill === ExamSkill.LISTENING
      ? 'listeningTestId'
      : skill === ExamSkill.READING
        ? 'readingTestId'
        : skill === ExamSkill.WRITING
          ? 'writingTestId'
          : 'speakingBankId';
  const id = pkg[field];
  return typeof id === 'string' && id.length > 0 ? id : null;
}

/**
 * Resolve the pinned content test for a package skill.
 * Uses the content pool row or legacy package FK only — never guesses from
 * "latest published" tests, which would silently serve the wrong exam paper.
 */
export async function resolvePackageContentTestId(
  prisma: PrismaClient,
  pkg: PackageContentFields,
  skill: ExamSkill,
): Promise<string | null> {
  const skillIncluded =
    packageIncludesSkill(pkg.skills, skill) ||
    explicitPackageContentTestId(pkg, skill) != null;

  if (!skillIncluded) return null;

  return packageTestIdForSkill(prisma, pkg, skill);
}
