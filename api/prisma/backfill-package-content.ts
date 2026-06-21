/**
 * Backfill packageKind, mockNumber, and PackageContentTest rows for existing databases.
 * Run after `prisma db push` when upgrading to exclusive package content:
 *
 *   npx tsx prisma/backfill-package-content.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function derivePackageKind(skills: unknown): string {
  if (!Array.isArray(skills)) return 'listening+reading+writing+speaking';
  const order = ['listening', 'reading', 'writing', 'speaking'] as const;
  const want = new Set(
    skills.map((entry) => String(entry).toLowerCase()),
  );
  return order.filter((skill) => want.has(skill)).join('+') || 'unknown';
}

async function main() {
  const packages = await prisma.mockTestPackage.findMany({
    orderBy: { createdAt: 'asc' },
  });

  const nextByKind = new Map<string, number>();

  for (const pkg of packages) {
    const packageKind = pkg.packageKind || derivePackageKind(pkg.skills);
    const mockNumber =
      pkg.mockNumber ||
      (() => {
        const next = (nextByKind.get(packageKind) ?? 0) + 1;
        nextByKind.set(packageKind, next);
        return next;
      })();

    await prisma.mockTestPackage.update({
      where: { id: pkg.id },
      data: { packageKind, mockNumber },
    });

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
      const existing = await prisma.packageContentTest.findUnique({
        where: { testId: link.testId },
      });
      if (existing && existing.packageId !== pkg.id) {
        console.warn(
          `Skipping ${link.testId} for package ${pkg.slug}: already assigned to ${existing.packageId}`,
        );
        continue;
      }
      await prisma.packageContentTest.upsert({
        where: { testId: link.testId },
        create: {
          packageId: pkg.id,
          testId: link.testId,
          skill: link.skill,
        },
        update: {
          packageId: pkg.id,
          skill: link.skill,
        },
      });
    }

    console.log(`Backfilled ${pkg.slug} → ${packageKind} #${mockNumber}`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
