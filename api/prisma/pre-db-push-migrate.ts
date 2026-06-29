/**
 * Runs before `prisma db push` on production so new unique constraints succeed.
 * Assigns distinct packageKind + mockNumber per row and dedupes content pool links.
 */
import { ExamSkill, PrismaClient } from '@prisma/client';
import { defaultBandRowsForSkill, bandFromRawScoreTable } from '../src/common/ielts-band-tables';
import {
  detectExclusiveAssignmentConflict,
  formatExclusiveAssignmentConflict,
} from '../src/modules/admin/package-content-migration';

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

  // Build pool rows from legacy FKs; warn loudly on duplicate exclusive assignments.
  const assignedTests = new Map<string, { slug: string; skill: string }>();
  const conflicts: string[] = [];
  const autoClearDuplicates =
    process.env.MIGRATION_AUTO_CLEAR_DUPLICATE_FKS === 'true';

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
      // L/R/W papers stay globally exclusive; SPEAKING banks are reusable pools
      // that may be shared across packages, so they skip the dedup/steal logic.
      const isExclusive = link.skill !== 'SPEAKING';

      if (isExclusive) {
        const conflict = detectExclusiveAssignmentConflict(
          assignedTests,
          pkg.slug,
          link.skill,
          link.testId,
        );
        if (conflict) {
          const message = formatExclusiveAssignmentConflict(conflict);
          conflicts.push(message);
          console.error(`[package-content] CONFLICT: ${message}`);
          console.error(
            '  Fix in Admin → Packages (archive/replace package or change content) before deploy.',
          );
          if (autoClearDuplicates) {
            console.warn(
              '  MIGRATION_AUTO_CLEAR_DUPLICATE_FKS=true — clearing duplicate FK (legacy behavior).',
            );
            const data: Record<string, null> = {};
            if (link.skill === 'LISTENING') data.listeningTestId = null;
            if (link.skill === 'READING') data.readingTestId = null;
            if (link.skill === 'WRITING') data.writingTestId = null;
            await prisma.mockTestPackage.update({ where: { id: pkg.id }, data });
          }
          continue;
        }
      }

      if (isExclusive) {
        assignedTests.set(link.testId, { slug: pkg.slug, skill: link.skill });
      }

      const byPackageSkill = await prisma.packageContentTest.findUnique({
        where: {
          packageId_skill: { packageId: pkg.id, skill: link.skill },
        },
      });
      if (byPackageSkill) {
        if (byPackageSkill.testId !== link.testId) {
          await prisma.packageContentTest.update({
            where: { id: byPackageSkill.id },
            data: { testId: link.testId },
          });
        }
        continue;
      }

      // For exclusive skills, move an orphaned pool row to this package; speaking
      // banks always get their own per-package row.
      if (isExclusive) {
        const existingPool = await prisma.packageContentTest.findFirst({
          where: { testId: link.testId },
        });
        if (existingPool) {
          await prisma.packageContentTest.update({
            where: { id: existingPool.id },
            data: { packageId: pkg.id, skill: link.skill },
          });
          continue;
        }
      }

      await prisma.packageContentTest.create({
        data: {
          packageId: pkg.id,
          testId: link.testId,
          skill: link.skill,
        },
      });
    }
  }

  console.log('Content pool pre-migration complete.');

  if (conflicts.length > 0) {
    console.error(
      `[package-content] ${conflicts.length} exclusive content conflict(s) detected.`,
    );
    if (process.env.MIGRATION_STRICT_PACKAGE_CONTENT === 'true') {
      throw new Error(
        'Package content conflicts must be resolved before deploy (set MIGRATION_STRICT_PACKAGE_CONTENT=false to override).',
      );
    }
  }

  const hasSuspendedAt = await columnExists('exam_sessions', 'suspended_at');
  if (!hasSuspendedAt) {
    console.log('Adding exam_sessions.suspended_at / suspend_reason...');
    await prisma.$executeRawUnsafe(`
      ALTER TABLE exam_sessions
      ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMP(3),
      ADD COLUMN IF NOT EXISTS suspend_reason TEXT;
    `);
    console.log('Exam session suspend columns ready.');
  }

  const hasEmailVerifiedAt = await columnExists('users', 'email_verified_at');
  const hasEmailVerificationToken = await columnExists(
    'users',
    'email_verification_token',
  );

  if (!hasEmailVerifiedAt || !hasEmailVerificationToken) {
    console.log('Adding users.email_verified_at / email_verification_* columns...');
    await prisma.$executeRawUnsafe(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP(3),
      ADD COLUMN IF NOT EXISTS email_verification_token TEXT,
      ADD COLUMN IF NOT EXISTS email_verification_expires TIMESTAMP(3);
    `);
  }

  // Accounts that existed before email verification have no token to click.
  // Backfill only tokenless users; newly registered users still must verify.
  const legacyVerified = await prisma.user.updateMany({
    where: {
      emailVerifiedAt: null,
      emailVerificationToken: null,
    },
    data: { emailVerifiedAt: new Date() },
  });
  console.log(`Marked ${legacyVerified.count} legacy account(s) as email verified.`);

  const activeBandRows = await prisma.bandConversionTable.count({
    where: { isActive: true },
  });
  if (activeBandRows < 41) {
    console.log('Seeding IELTS Academic band conversion table (0–40)...');
    for (const skill of [ExamSkill.LISTENING, ExamSkill.READING] as const) {
      for (const row of defaultBandRowsForSkill(skill)) {
        await prisma.bandConversionTable.upsert({
          where: {
            skill_rawScore: { skill, rawScore: row.rawScore },
          },
          create: {
            skill,
            rawScore: row.rawScore,
            band: row.band,
            isActive: true,
          },
          update: { band: row.band, isActive: true },
        });
      }
    }
    console.log('Band conversion table ready.');
  }

  const lrAttempts = await prisma.sectionAttempt.findMany({
    where: {
      skill: { in: [ExamSkill.LISTENING, ExamSkill.READING] },
      rawScore: { not: null },
      submittedAt: { not: null },
    },
    select: { id: true, skill: true, rawScore: true, band: true },
  });

  let bandsFixed = 0;
  for (const attempt of lrAttempts) {
    const expected = bandFromRawScoreTable(attempt.skill, attempt.rawScore!);
    if (expected != null && attempt.band !== expected) {
      await prisma.sectionAttempt.update({
        where: { id: attempt.id },
        data: { band: expected },
      });
      bandsFixed++;
    }
  }
  if (bandsFixed > 0) {
    console.log(`Synced band scores for ${bandsFixed} L/R section attempt(s).`);
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
