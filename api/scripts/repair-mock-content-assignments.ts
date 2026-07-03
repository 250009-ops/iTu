/**
 * Repair exclusive L/R/W assignments for full mocks that share the same test
 * because deploy patch previously overwrote listening on every package.
 *
 * Only updates packages with zero enrollments that participate in a duplicate
 * L/R/W assignment across active full mocks. Packages with students enrolled
 * keep their links (use Admin → Replace mock to change those).
 *
 * Run: npx tsx scripts/repair-mock-content-assignments.ts
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

const TYPE_PREFIX: Record<ExamSkill, string> = {
  LISTENING: 'LIS',
  READING: 'REA',
  WRITING: 'WRI',
  SPEAKING: 'SPK',
};

/** Full Mock 001 → *-MOCK-A002, Full Mock 002 → *-MOCK-A003, etc. */
function expectedTestCode(skill: ExamSkill, mockNumber: number): string {
  const suffix = String(mockNumber + 1).padStart(3, '0');
  return `${TYPE_PREFIX[skill]}-MOCK-A${suffix}`;
}

async function buildConflictLinks(): Promise<PackageContentLink[]> {
  const packages = await prisma.mockTestPackage.findMany({
    where: { packageKind: FULL_MOCK_KIND },
    select: {
      slug: true,
      isActive: true,
      listeningTestId: true,
      readingTestId: true,
      writingTestId: true,
    },
  });

  const links: PackageContentLink[] = [];
  for (const pkg of packages) {
    if (pkg.listeningTestId) {
      links.push({
        packageSlug: pkg.slug,
        packageActive: pkg.isActive,
        skill: ExamSkill.LISTENING,
        testId: pkg.listeningTestId,
      });
    }
    if (pkg.readingTestId) {
      links.push({
        packageSlug: pkg.slug,
        packageActive: pkg.isActive,
        skill: ExamSkill.READING,
        testId: pkg.readingTestId,
      });
    }
    if (pkg.writingTestId) {
      links.push({
        packageSlug: pkg.slug,
        packageActive: pkg.isActive,
        skill: ExamSkill.WRITING,
        testId: pkg.writingTestId,
      });
    }
  }
  return links;
}

async function main() {
  const conflicts = findExclusiveContentConflicts(await buildConflictLinks());
  if (conflicts.length === 0) {
    console.log('No exclusive content conflicts — nothing to repair.');
    return;
  }

  const conflictSlugs = new Set<string>();
  for (const conflict of conflicts) {
    console.log(
      `Conflict: ${conflict.skill} test shared by ${conflict.packages.join(', ')}`,
    );
    for (const slug of conflict.packages) conflictSlugs.add(slug);
  }

  const packages = await prisma.mockTestPackage.findMany({
    where: {
      packageKind: FULL_MOCK_KIND,
      slug: { in: [...conflictSlugs] },
    },
    include: { _count: { select: { enrollments: true } } },
    orderBy: { mockNumber: 'asc' },
  });

  let repaired = 0;
  let skipped = 0;

  for (const pkg of packages) {
    if (pkg._count.enrollments > 0) {
      skipped += 1;
      console.log(
        `Skip "${pkg.slug}" (mock ${pkg.mockNumber}) — ${pkg._count.enrollments} enrollment(s)`,
      );
      continue;
    }

    const skills = packageExamSkills(pkg.skills);
    const data: {
      listeningTestId?: string | null;
      readingTestId?: string | null;
      writingTestId?: string | null;
      speakingBankId?: string | null;
    } = {};

    for (const skill of skills) {
      if (skill === ExamSkill.SPEAKING) continue;
      const code = expectedTestCode(skill, pkg.mockNumber);
      const test = await prisma.contentTest.findFirst({
        where: {
          code,
          type: skill as ContentTestType,
          status: ContentTestStatus.PUBLISHED,
        },
        select: { id: true },
      });
      if (!test) {
        console.warn(`  No published test ${code} for "${pkg.slug}"`);
        continue;
      }
      if (skill === ExamSkill.LISTENING) data.listeningTestId = test.id;
      if (skill === ExamSkill.READING) data.readingTestId = test.id;
      if (skill === ExamSkill.WRITING) data.writingTestId = test.id;
    }

    const speakingCode = expectedTestCode(ExamSkill.SPEAKING, pkg.mockNumber);
    const speaking = await prisma.contentTest.findFirst({
      where: {
        code: speakingCode,
        type: ContentTestType.SPEAKING,
        status: ContentTestStatus.PUBLISHED,
      },
      select: { id: true },
    });
    if (speaking) data.speakingBankId = speaking.id;

    if (Object.keys(data).length === 0) continue;

    const updated = await prisma.mockTestPackage.update({
      where: { id: pkg.id },
      data,
    });

    await syncPackageContentPoolFromFks(prisma, pkg.id, updated, pkg.skills);
    repaired += 1;
    console.log(
      `Repaired "${pkg.slug}" → ${Object.entries(data)
        .map(([k, v]) => `${k}=${v}`)
        .join(', ')}`,
    );
  }

  const remaining = findExclusiveContentConflicts(await buildConflictLinks());
  if (remaining.length > 0) {
    console.warn(
      `${remaining.length} conflict(s) remain (packages with enrollments must be fixed in Admin).`,
    );
  }

  console.log(
    `Repair complete: ${repaired} package(s) updated, ${skipped} skipped (has enrollments).`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
