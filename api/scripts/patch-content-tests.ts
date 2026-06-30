/**
 * Patch bundled content tests on an existing database (production-safe).
 * - Updates listening/reading/speaking published tests with synced content
 * - Links package content FKs when missing but skill is included
 * - Removes orphan draft tests left from Content Studio experiments
 *
 * Usage: npx tsx scripts/patch-content-tests.ts
 */
import { ContentTestStatus, ContentTestType, PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

function loadJson<T>(filename: string): T {
  const filePath = path.join(__dirname, '..', 'prisma', 'data', filename);
  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
}

function packageSkills(pkg: { skills: unknown }): string[] {
  if (!Array.isArray(pkg.skills)) return [];
  return pkg.skills.map((s) => String(s).toLowerCase());
}

async function upsertPublished(
  type: ContentTestType,
  code: string,
  title: string,
  durationMin: number,
  content: object,
  answerKey?: object,
) {
  const existing = await prisma.contentTest.findFirst({
    where: { type, status: ContentTestStatus.PUBLISHED },
    orderBy: { updatedAt: 'desc' },
  });

  if (existing) {
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
      content,
      ...(answerKey !== undefined ? { answerKey } : {}),
    },
  });
  console.log(`Created ${type.toLowerCase()} test: ${created.code}`);
  return created.id;
}

async function linkPackages(ids: {
  listeningId?: string;
  readingId?: string;
  writingId?: string;
  speakingId?: string;
}) {
  const listeningWithAudio = await prisma.contentTest.findFirst({
    where: {
      type: ContentTestType.LISTENING,
      status: ContentTestStatus.PUBLISHED,
      mediaAssets: { some: { key: 'full-audio' } },
    },
    orderBy: { updatedAt: 'desc' },
    select: { id: true },
  });
  const listeningId = listeningWithAudio?.id ?? ids.listeningId;

  const packages = await prisma.mockTestPackage.findMany();
  let linked = 0;

  for (const pkg of packages) {
    const skills = packageSkills(pkg);
    const data: Record<string, string> = {};

    if (skills.includes('listening') && listeningId) {
      data.listeningTestId = listeningId;
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

    if (Object.keys(data).length > 0) {
      await prisma.mockTestPackage.update({
        where: { id: pkg.id },
        data,
      });
      console.log(`Linked package "${pkg.slug}": ${Object.keys(data).join(', ')}`);
      linked += 1;
    }
  }

  console.log(`Package link pass complete (${linked} package(s) updated).`);
}

async function main() {
  console.log('Patching content tests...');

  const listeningId = await upsertPublished(
    ContentTestType.LISTENING,
    'LIS-MOCK-A001',
    'Listening Mock-A001',
    32,
    loadJson('listening.json'),
    loadJson('listening-answer-key.json'),
  );

  const readingId = await upsertPublished(
    ContentTestType.READING,
    'REA-MOCK-A001',
    'Reading Mock-A001',
    60,
    loadJson('reading.json'),
    loadJson('reading-answer-key.json'),
  );

  const writingId = await upsertPublished(
    ContentTestType.WRITING,
    'WRI-MOCK-A001',
    'Writing Mock-A001',
    60,
    loadJson('writing.json'),
  );

  const speakingId = await upsertPublished(
    ContentTestType.SPEAKING,
    'SPK-MOCK-A001',
    'Speaking Mock-A001',
    15,
    loadJson('speaking.json'),
  );

  await linkPackages({ listeningId, readingId, writingId, speakingId });

  const removed = await prisma.contentTest.deleteMany({
    where: { status: ContentTestStatus.DRAFT },
  });
  console.log(`Removed ${removed.count} draft test(s).`);

  console.log('Content patch complete.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
