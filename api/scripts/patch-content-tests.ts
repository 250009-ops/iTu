/**
 * Patch bundled content tests on an existing database (production-safe).
 * - Updates seed tests by code (LIS-MOCK-A001, etc.) without touching other published tests
 * - Links package content FKs only when a skill link is still missing
 * - Syncs package_content_tests pool rows from FKs
 *
 * Does not delete Content Studio drafts — those are admin-owned working copies.
 * Usage: npx tsx scripts/patch-content-tests.ts
 */
import {
  ContentTestStatus,
  ContentTestType,
  ExamSkill,
  PrismaClient,
} from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { syncPackageContentPoolFromFks } from './sync-package-content-pools';

const prisma = new PrismaClient();

function loadJson<T>(filename: string): T {
  const filePath = path.join(__dirname, '..', 'prisma', 'data', filename);
  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
}

function packageSkills(pkg: { skills: unknown }): string[] {
  if (!Array.isArray(pkg.skills)) return [];
  return pkg.skills.map((s) => String(s).toLowerCase());
}

/** Update or create the bundled seed test for a single code — never the "latest" test. */
async function upsertPublishedByCode(
  type: ContentTestType,
  code: string,
  title: string,
  durationMin: number,
  content: object,
  answerKey?: object,
) {
  const existing = await prisma.contentTest.findFirst({
    where: { code, type, institutionId: null },
  });

  if (existing) {
    if (existing.status !== ContentTestStatus.PUBLISHED) {
      console.log(`Skip ${code} — not published`);
      return existing.id;
    }
    await prisma.contentTest.update({
      where: { id: existing.id },
      data: {
        content,
        ...(answerKey !== undefined ? { answerKey } : {}),
        durationMin,
      },
    });
    console.log(`Updated ${type.toLowerCase()} test: ${existing.code}`);
    return existing.id;
  }

  const created = await prisma.contentTest.create({
    data: {
      code,
      title,
      type,
      status: ContentTestStatus.PUBLISHED,
      durationMin,
      publishedAt: new Date(),
      institutionId: null,
      content,
      ...(answerKey !== undefined ? { answerKey } : {}),
    },
  });
  console.log(`Created ${type.toLowerCase()} test: ${created.code}`);
  return created.id;
}

async function defaultListeningWithAudioId(): Promise<string | undefined> {
  const row = await prisma.contentTest.findFirst({
    where: {
      type: ContentTestType.LISTENING,
      status: ContentTestStatus.PUBLISHED,
      institutionId: null,
      mediaAssets: { some: { key: 'full-audio' } },
    },
    orderBy: { code: 'asc' },
    select: { id: true },
  });
  return row?.id;
}

async function linkPackages(ids: {
  listeningId?: string;
  readingId?: string;
  writingId?: string;
  speakingId?: string;
}) {
  const listeningFallback =
    (await defaultListeningWithAudioId()) ?? ids.listeningId;

  const packages = await prisma.mockTestPackage.findMany({
    where: { institutionId: null },
  });
  let linked = 0;

  for (const pkg of packages) {
    const skills = packageSkills(pkg);
    const data: Record<string, string> = {};

    if (skills.includes('listening') && !pkg.listeningTestId && listeningFallback) {
      data.listeningTestId = listeningFallback;
    }
    if (skills.includes('reading') && !pkg.readingTestId && ids.readingId) {
      data.readingTestId = ids.readingId;
    }
    if (skills.includes('writing') && !pkg.writingTestId && ids.writingId) {
      data.writingTestId = ids.writingId;
    }
    if (skills.includes('speaking') && !pkg.speakingBankId && ids.speakingId) {
      data.speakingBankId = ids.speakingId;
    }

    if (Object.keys(data).length === 0) continue;

    const updated = await prisma.mockTestPackage.update({
      where: { id: pkg.id },
      data,
    });
    await syncPackageContentPoolFromFks(prisma, pkg.id, updated, pkg.skills);
    console.log(`Linked package "${pkg.slug}": ${Object.keys(data).join(', ')}`);
    linked += 1;
  }

  console.log(`Package link pass complete (${linked} package(s) updated).`);
}

async function syncAllPackagePools() {
  const packages = await prisma.mockTestPackage.findMany({
    where: { institutionId: null },
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

async function main() {
  console.log('Patching content tests...');

  const listeningId = await upsertPublishedByCode(
    ContentTestType.LISTENING,
    'LIS-MOCK-A001',
    'Listening Mock-A001',
    32,
    loadJson('listening.json'),
    loadJson('listening-answer-key.json'),
  );

  const readingId = await upsertPublishedByCode(
    ContentTestType.READING,
    'REA-MOCK-A001',
    'Reading Mock-A001',
    60,
    loadJson('reading.json'),
    loadJson('reading-answer-key.json'),
  );

  const writingId = await upsertPublishedByCode(
    ContentTestType.WRITING,
    'WRI-MOCK-A001',
    'Writing Mock-A001',
    60,
    loadJson('writing.json'),
  );

  const speakingId = await upsertPublishedByCode(
    ContentTestType.SPEAKING,
    'SPK-MOCK-A001',
    'Speaking Mock-A001',
    15,
    loadJson('speaking.json'),
  );

  await linkPackages({ listeningId, readingId, writingId, speakingId });
  await syncAllPackagePools();

  console.log('Content patch complete.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
