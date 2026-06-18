import {
  ContentTestStatus,
  ContentTestType,
  ExamSkill,
  type MockTestPackage,
  PrismaClient,
} from '@prisma/client';
import { packageIncludesExamSkill } from './package-skills';

type PackageContentFields = Pick<
  MockTestPackage,
  'listeningTestId' | 'readingTestId' | 'writingTestId' | 'speakingBankId' | 'skills'
>;

const SKILL_FIELD: Record<
  ExamSkill,
  keyof Pick<
    MockTestPackage,
    'listeningTestId' | 'readingTestId' | 'writingTestId' | 'speakingBankId'
  >
> = {
  LISTENING: 'listeningTestId',
  READING: 'readingTestId',
  WRITING: 'writingTestId',
  SPEAKING: 'speakingBankId',
};

const SKILL_TO_TYPE: Record<ExamSkill, ContentTestType> = {
  LISTENING: ContentTestType.LISTENING,
  READING: ContentTestType.READING,
  WRITING: ContentTestType.WRITING,
  SPEAKING: ContentTestType.SPEAKING,
};

/** True when the package JSON `skills` array includes this exam skill. */
export function packageIncludesSkill(
  skills: unknown,
  skill: ExamSkill,
): boolean {
  return packageIncludesExamSkill(skills, skill);
}

export function explicitPackageContentTestId(
  pkg: PackageContentFields,
  skill: ExamSkill,
): string | null {
  const id = pkg[SKILL_FIELD[skill]];
  return typeof id === 'string' && id.length > 0 ? id : null;
}

/**
 * Resolve the content test id for a package skill.
 * Uses explicit package FK when set; otherwise falls back to the latest
 * published test of that type when the package includes the skill.
 */
async function latestPublishedTestId(
  prisma: PrismaClient,
  skill: ExamSkill,
): Promise<string | null> {
  const test = await prisma.contentTest.findFirst({
    where: {
      type: SKILL_TO_TYPE[skill],
      status: ContentTestStatus.PUBLISHED,
    },
    orderBy: { updatedAt: 'desc' },
    select: { id: true },
  });
  return test?.id ?? null;
}

export async function resolvePackageContentTestId(
  prisma: PrismaClient,
  pkg: PackageContentFields,
  skill: ExamSkill,
): Promise<string | null> {
  const skillIncluded =
    packageIncludesSkill(pkg.skills, skill) ||
    explicitPackageContentTestId(pkg, skill) != null;

  if (!skillIncluded) return null;

  const explicit = explicitPackageContentTestId(pkg, skill);
  if (explicit) {
    const linked = await prisma.contentTest.findUnique({
      where: { id: explicit },
      select: { id: true, status: true },
    });
    if (linked?.status === ContentTestStatus.PUBLISHED) {
      return linked.id;
    }
  }

  return latestPublishedTestId(prisma, skill);
}
