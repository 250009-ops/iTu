/**
 * Fix exclusive L/R/W conflicts across active packages:
 * - Full mocks get unique tests by mockNumber (LIS-MOCK-A00N)
 * - Skill-only packages get dedicated *-MOCK-A002 tests (cloned from A001 if missing)
 *
 * Run: npx tsx scripts/fix-exclusive-content-conflicts.ts
 */
import {
  ContentTestStatus,
  ContentTestType,
  ExamSkill,
  PrismaClient,
} from '@prisma/client';
import {
  findExclusiveContentConflicts,
  type PackageContentLink,
} from '../src/modules/admin/package-content-verify';
import { packageExamSkills } from '../src/modules/content/package-skills';
import { syncPackageContentPoolFromFks } from './sync-package-content-pools';

const prisma = new PrismaClient();

const FULL_MOCK_KIND = 'listening+reading+writing+speaking';
const SKILL_ONLY_KINDS = new Set(['listening', 'reading', 'writing']);

const TYPE_PREFIX: Record<ExamSkill, string> = {
  LISTENING: 'LIS',
  READING: 'REA',
  WRITING: 'WRI',
  SPEAKING: 'SPK',
};

function expectedTestCode(skill: ExamSkill, mockNumber: number): string {
  const suffix = String(mockNumber + 1).padStart(3, '0');
  return `${TYPE_PREFIX[skill]}-MOCK-A${suffix}`;
}

async function buildActiveLinks(): Promise<PackageContentLink[]> {
  const packages = await prisma.mockTestPackage.findMany({
    where: { isActive: true },
    select: {
      slug: true,
      isActive: true,
      skills: true,
      listeningTestId: true,
      readingTestId: true,
      writingTestId: true,
      contentPool: { select: { skill: true, testId: true } },
    },
  });

  const links: PackageContentLink[] = [];
  for (const pkg of packages) {
    for (const skill of packageExamSkills(pkg.skills)) {
      if (
        skill !== ExamSkill.LISTENING &&
        skill !== ExamSkill.READING &&
        skill !== ExamSkill.WRITING
      ) {
        continue;
      }
      const pool = pkg.contentPool.find((row) => row.skill === skill);
      const legacyId =
        skill === ExamSkill.LISTENING
          ? pkg.listeningTestId
          : skill === ExamSkill.READING
            ? pkg.readingTestId
            : pkg.writingTestId;
      const testId = pool?.testId ?? legacyId;
      if (!testId) continue;
      links.push({
        packageSlug: pkg.slug,
        packageActive: true,
        skill,
        testId,
      });
    }
  }
  return links;
}

async function clonePublishedTest(
  sourceCode: string,
  targetCode: string,
  type: ContentTestType,
): Promise<string | null> {
  const existing = await prisma.contentTest.findFirst({
    where: { code: targetCode, type, institutionId: null },
    select: { id: true, status: true },
  });
  if (existing?.status === ContentTestStatus.PUBLISHED) return existing.id;

  const source = await prisma.contentTest.findFirst({
    where: { code: sourceCode, type, institutionId: null, status: ContentTestStatus.PUBLISHED },
    include: { mediaAssets: true },
  });
  if (!source) {
    console.warn(`  No source test ${sourceCode} to clone`);
    return null;
  }

  const title = source.title.replace(/A001/g, targetCode.slice(-7));
  const created = await prisma.contentTest.create({
    data: {
      code: targetCode,
      title,
      type,
      status: ContentTestStatus.PUBLISHED,
      durationMin: source.durationMin,
      publishedAt: new Date(),
      institutionId: null,
      content: source.content ?? {},
      answerKey: source.answerKey ?? undefined,
      mediaAssets: {
        create: source.mediaAssets.map((asset) => ({
          key: asset.key,
          url: asset.url,
          mimeType: asset.mimeType,
          sizeBytes: asset.sizeBytes,
        })),
      },
    },
  });
  console.log(`  Cloned ${sourceCode} → ${targetCode}`);
  return created.id;
}

async function ensureTestByCode(
  skill: ExamSkill,
  code: string,
): Promise<string | null> {
  const type = skill as unknown as ContentTestType;
  const row = await prisma.contentTest.findFirst({
    where: { code, type, institutionId: null, status: ContentTestStatus.PUBLISHED },
    select: { id: true },
  });
  if (row) return row.id;

  const sourceCode = `${TYPE_PREFIX[skill]}-MOCK-A001`;
  return clonePublishedTest(sourceCode, code, type);
}

async function assignPackageSkill(
  packageId: string,
  slug: string,
  skills: unknown,
  skill: ExamSkill,
  testId: string,
) {
  const data =
    skill === ExamSkill.LISTENING
      ? { listeningTestId: testId }
      : skill === ExamSkill.READING
        ? { readingTestId: testId }
        : { writingTestId: testId };

  const updated = await prisma.mockTestPackage.update({
    where: { id: packageId },
    data,
  });
  await syncPackageContentPoolFromFks(prisma, packageId, updated, skills);
  console.log(`  ${slug} → ${skill} test ${testId}`);
}

async function main() {
  let conflicts = findExclusiveContentConflicts(await buildActiveLinks());
  if (conflicts.length === 0) {
    console.log('No exclusive content conflicts.');
    return;
  }

  console.log(`Found ${conflicts.length} conflict(s). Fixing…`);

  const packages = await prisma.mockTestPackage.findMany({
    where: { isActive: true },
    include: { _count: { select: { enrollments: true } } },
    orderBy: [{ packageKind: 'asc' }, { mockNumber: 'asc' }],
  });

  for (const pkg of packages) {
    if (pkg._count.enrollments > 0) {
      console.log(`Skip "${pkg.slug}" — ${pkg._count.enrollments} enrollment(s)`);
      continue;
    }

    const skills = packageExamSkills(pkg.skills);

    if (pkg.packageKind === FULL_MOCK_KIND) {
      for (const skill of skills) {
        if (
          skill !== ExamSkill.LISTENING &&
          skill !== ExamSkill.READING &&
          skill !== ExamSkill.WRITING
        ) {
          continue;
        }
        const code = expectedTestCode(skill, pkg.mockNumber);
        const testId = await ensureTestByCode(skill, code);
        if (!testId) continue;
        await assignPackageSkill(pkg.id, pkg.slug, pkg.skills, skill, testId);
      }
      continue;
    }

    if (SKILL_ONLY_KINDS.has(pkg.packageKind)) {
      const skillMap: Record<string, ExamSkill> = {
        listening: ExamSkill.LISTENING,
        reading: ExamSkill.READING,
        writing: ExamSkill.WRITING,
      };
      const skill = skillMap[pkg.packageKind];
      if (!skill) continue;
      const code = expectedTestCode(skill, 2);
      const testId = await ensureTestByCode(skill, code);
      if (!testId) continue;
      await assignPackageSkill(pkg.id, pkg.slug, pkg.skills, skill, testId);
    }
  }

  conflicts = findExclusiveContentConflicts(await buildActiveLinks());
  if (conflicts.length > 0) {
    console.warn(`${conflicts.length} conflict(s) remain:`);
    for (const c of conflicts) {
      console.warn(`  ${c.skill}: ${c.packages.join(', ')}`);
    }
    process.exit(1);
  }

  console.log('All exclusive content conflicts resolved.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
