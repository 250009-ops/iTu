/**
 * Align package_content_tests pool rows with legacy package FKs.
 * Safe to run on every deploy — does not change which tests are linked.
 */
import { ExamSkill, PrismaClient } from '@prisma/client';
import { SKILL_TO_TEST_FIELD } from '../src/common/package-kind';
import { packageExamSkills } from '../src/modules/content/package-skills';

const prisma = new PrismaClient();

const SKILL_FIELDS: { skill: ExamSkill; field: keyof typeof SKILL_TO_TEST_FIELD }[] = [
  { skill: ExamSkill.LISTENING, field: 'LISTENING' },
  { skill: ExamSkill.READING, field: 'READING' },
  { skill: ExamSkill.WRITING, field: 'WRITING' },
  { skill: ExamSkill.SPEAKING, field: 'SPEAKING' },
];

export async function syncPackageContentPoolFromFks(
  client: PrismaClient,
  packageId: string,
  links: {
    listeningTestId: string | null;
    readingTestId: string | null;
    writingTestId: string | null;
    speakingBankId: string | null;
  },
  skills: unknown,
) {
  const required = new Set(packageExamSkills(skills));

  for (const { skill } of SKILL_FIELDS) {
    if (!required.has(skill)) {
      await client.packageContentTest.deleteMany({ where: { packageId, skill } });
    }
  }

  for (const { skill, field } of SKILL_FIELDS) {
    if (!required.has(skill)) continue;
    const testId = links[SKILL_TO_TEST_FIELD[field] as keyof typeof links] ?? null;
    if (!testId) {
      await client.packageContentTest.deleteMany({ where: { packageId, skill } });
      continue;
    }
    await client.packageContentTest.upsert({
      where: { packageId_skill: { packageId, skill } },
      create: { packageId, skill, testId },
      update: { testId },
    });
  }
}

async function main() {
  const packages = await prisma.mockTestPackage.findMany({
    select: {
      id: true,
      skills: true,
      listeningTestId: true,
      readingTestId: true,
      writingTestId: true,
      speakingBankId: true,
    },
  });

  for (const pkg of packages) {
    await syncPackageContentPoolFromFks(prisma, pkg.id, pkg, pkg.skills);
  }

  console.log(`Synced content pools for ${packages.length} package(s).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
