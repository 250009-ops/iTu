import {
  ContentTestStatus,
  ContentTestType,
  ExamSkill,
  type MockTestPackage,
  PrismaClient,
} from '@prisma/client';

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
  if (!Array.isArray(skills)) return false;
  const want = skill.toLowerCase();
  return skills.some((s) => String(s).toLowerCase() === want);
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
export async function resolvePackageContentTestId(
  prisma: PrismaClient,
  pkg: PackageContentFields,
  skill: ExamSkill,
): Promise<string | null> {
  const explicit = explicitPackageContentTestId(pkg, skill);
  if (explicit) return explicit;

  if (!packageIncludesSkill(pkg.skills, skill)) return null;

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
