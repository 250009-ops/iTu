/**
 * Pre-launch production audit — run against DATABASE_URL (local or VPS).
 *
 *   cd api && npm run verify:production
 *
 * Optional:
 *   API_URL=https://itestu.uz  — also checks GET /api/v1/health
 */
import {
  ContentTestStatus,
  ContentTestType,
  ExamSkill,
  PrismaClient,
} from '@prisma/client';
import { listeningAudioReady } from '../src/modules/content/content.utils';
import { packageExamSkills } from '../src/modules/content/package-skills';
import {
  findExclusiveContentConflicts,
  formatExclusiveContentConflict,
} from '../src/modules/admin/package-content-verify';
import { EXCLUSIVE_PACKAGE_SKILLS } from '../src/modules/admin/package-lifecycle';

const prisma = new PrismaClient();
const issues: string[] = [];

function fail(message: string) {
  issues.push(message);
  console.error(`✗ ${message}`);
}

function ok(message: string) {
  console.log(`✓ ${message}`);
}

async function checkApiHealth() {
  const base = process.env.API_URL?.replace(/\/$/, '');
  if (!base) {
    console.log('— Skipping API health (set API_URL to enable)');
    return;
  }

  try {
    const res = await fetch(`${base}/api/v1/health`);
    if (!res.ok) {
      fail(`API health returned HTTP ${res.status}`);
      return;
    }
    const body = (await res.json()) as {
      status?: string;
      database?: string;
      redis?: string;
    };
    if (body.status !== 'ok') {
      fail(`API health status is "${body.status ?? 'unknown'}"`);
      return;
    }
    if (body.database && body.database !== 'up') {
      fail(`API reports database "${body.database}"`);
    }
    if (body.redis && body.redis !== 'up') {
      fail(`API reports redis "${body.redis}"`);
    }
    ok(`API health OK (${base})`);
  } catch (err) {
    fail(`API health request failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

async function checkActivePackageContent() {
  const packages = await prisma.mockTestPackage.findMany({
    where: { isActive: true },
    include: {
      contentPool: { select: { skill: true, testId: true } },
    },
  });

  const poolLinks: {
    packageSlug: string;
    packageActive: boolean;
    skill: ExamSkill;
    testId: string;
  }[] = [];

  for (const pkg of packages) {
    const skills = packageExamSkills(pkg.skills);

    for (const skill of skills) {
      const pool = pkg.contentPool.find((row) => row.skill === skill);
      const legacyId =
        skill === ExamSkill.LISTENING
          ? pkg.listeningTestId
          : skill === ExamSkill.READING
            ? pkg.readingTestId
            : skill === ExamSkill.WRITING
              ? pkg.writingTestId
              : pkg.speakingBankId;
      const testId = pool?.testId ?? legacyId;

      if (!testId) {
        fail(`Active package "${pkg.slug}" is missing ${skill} content`);
        continue;
      }

      poolLinks.push({
        packageSlug: pkg.slug,
        packageActive: true,
        skill,
        testId,
      });

      const test = await prisma.contentTest.findUnique({
        where: { id: testId },
        select: { code: true, status: true },
      });
      if (!test) {
        fail(`Active package "${pkg.slug}" links missing ${skill} test ${testId}`);
      } else if (test.status !== ContentTestStatus.PUBLISHED) {
        fail(
          `Active package "${pkg.slug}" links unpublished ${skill} test (${test.code})`,
        );
      }
    }
  }

  const conflicts = findExclusiveContentConflicts(poolLinks);
  for (const conflict of conflicts) {
    fail(formatExclusiveContentConflict(conflict));
  }

  if (packages.length > 0 && conflicts.length === 0) {
    ok(`${packages.length} active package(s) have content assigned`);
  }
}

async function checkListeningMedia() {
  const tests = await prisma.contentTest.findMany({
    where: {
      type: ContentTestType.LISTENING,
      status: ContentTestStatus.PUBLISHED,
    },
    select: {
      id: true,
      code: true,
      content: true,
      mediaAssets: { select: { key: true } },
      poolEntries: {
        where: { package: { isActive: true } },
        select: { package: { select: { slug: true } } },
      },
    },
  });

  let checked = 0;
  for (const test of tests) {
    if (test.poolEntries.length === 0) continue;
    checked += 1;
    if (!listeningAudioReady(test.content, test.mediaAssets)) {
      const slugs = test.poolEntries.map((e) => e.package.slug).join(', ');
      fail(
        `Published listening test "${test.code}" lacks ready audio (packages: ${slugs})`,
      );
    }
  }

  if (checked > 0) {
    ok(`${checked} published listening test(s) linked to active packages have audio`);
  }
}

async function checkOrphanPoolRows() {
  const orphans = await prisma.packageContentTest.count({
    where: {
      skill: { in: [...EXCLUSIVE_PACKAGE_SKILLS] },
      package: { isActive: false },
    },
  });
  if (orphans > 0) {
    console.log(
      `— ${orphans} exclusive pool row(s) on archived packages (informational)`,
    );
  }
}

async function main() {
  console.log('Production verification\n');

  await checkApiHealth();
  await checkActivePackageContent();
  await checkListeningMedia();
  await checkOrphanPoolRows();

  console.log('');
  if (issues.length > 0) {
    console.error(`${issues.length} issue(s) found — do not launch until fixed.\n`);
    process.exit(1);
  }

  console.log('All checks passed.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
