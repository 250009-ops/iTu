/**
 * Runs before `prisma db push` on production so new unique constraints succeed.
 * Assigns distinct packageKind + mockNumber per row and dedupes content pool links.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function derivePackageKind(skills: unknown): string {
  if (!Array.isArray(skills)) return 'listening+reading+writing+speaking';
  const order = ['listening', 'reading', 'writing', 'speaking'] as const;
  const want = new Set(skills.map((entry) => String(entry).toLowerCase()));
  return order.filter((skill) => want.has(skill)).join('+') || 'unknown';
}

async function columnExists(table: string, column: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = ${table}
        AND column_name = ${column}
    ) AS exists
  `;
  return Boolean(rows[0]?.exists);
}

async function main() {
  const hasKind = await columnExists('mock_test_packages', 'package_kind');
  const hasNumber = await columnExists('mock_test_packages', 'mock_number');

  if (!hasKind || !hasNumber) {
    console.log('Adding package_kind / mock_number columns (nullable)...');
    await prisma.$executeRawUnsafe(`
      ALTER TABLE mock_test_packages
      ADD COLUMN IF NOT EXISTS package_kind TEXT,
      ADD COLUMN IF NOT EXISTS mock_number INTEGER;
    `);
  }

  const packages = await prisma.mockTestPackage.findMany({
    orderBy: { createdAt: 'asc' },
  });

  const nextByKind = new Map<string, number>();

  for (const pkg of packages) {
    const packageKind = derivePackageKind(pkg.skills);
    const mockNumber = (nextByKind.get(packageKind) ?? 0) + 1;
    nextByKind.set(packageKind, mockNumber);

    await prisma.mockTestPackage.update({
      where: { id: pkg.id },
      data: { packageKind, mockNumber },
    });

    console.log(`  ${pkg.slug} → ${packageKind} #${mockNumber}`);
  }

  console.log(`Backfilled mock numbers for ${packages.length} package(s).`);

  // Build pool rows from legacy FKs; keep first package per test when duplicated.
  const assignedTests = new Set<string>();

  for (const pkg of packages) {
    const links: { skill: 'LISTENING' | 'READING' | 'WRITING' | 'SPEAKING'; testId: string }[] =
      [];
    if (pkg.listeningTestId) {
      links.push({ skill: 'LISTENING', testId: pkg.listeningTestId });
    }
    if (pkg.readingTestId) {
      links.push({ skill: 'READING', testId: pkg.readingTestId });
    }
    if (pkg.writingTestId) {
      links.push({ skill: 'WRITING', testId: pkg.writingTestId });
    }
    if (pkg.speakingBankId) {
      links.push({ skill: 'SPEAKING', testId: pkg.speakingBankId });
    }

    for (const link of links) {
      if (assignedTests.has(link.testId)) {
        console.warn(
          `Test ${link.testId} already assigned — clearing duplicate FK on package ${pkg.slug}`,
        );
        const data: Record<string, null> = {};
        if (link.skill === 'LISTENING') data.listeningTestId = null;
        if (link.skill === 'READING') data.readingTestId = null;
        if (link.skill === 'WRITING') data.writingTestId = null;
        if (link.skill === 'SPEAKING') data.speakingBankId = null;
        await prisma.mockTestPackage.update({ where: { id: pkg.id }, data });
        continue;
      }

      assignedTests.add(link.testId);
      const existingPool = await prisma.packageContentTest.findFirst({
        where: { testId: link.testId },
      });
      if (existingPool) {
        await prisma.packageContentTest.update({
          where: { id: existingPool.id },
          data: { packageId: pkg.id, skill: link.skill },
        });
      } else {
        await prisma.packageContentTest.create({
          data: {
            packageId: pkg.id,
            testId: link.testId,
            skill: link.skill,
          },
        });
      }
    }
  }

  console.log('Content pool pre-migration complete.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
