/**
 * Patch bundled content tests on an existing database (production-safe).
 * - Updates listening/reading published tests with synced content + real answer keys
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

async function main() {
  console.log('Patching content tests...');

  const listeningContent = loadJson<object>('listening.json');
  const readingContent = loadJson<object>('reading.json');
  const listeningKey = loadJson<Record<string, string | string[]>>(
    'listening-answer-key.json',
  );
  const readingKey = loadJson<Record<string, string | string[]>>(
    'reading-answer-key.json',
  );

  const listening = await prisma.contentTest.findFirst({
    where: { type: ContentTestType.LISTENING, status: ContentTestStatus.PUBLISHED },
    orderBy: { updatedAt: 'desc' },
  });
  if (listening) {
    await prisma.contentTest.update({
      where: { id: listening.id },
      data: {
        content: listeningContent,
        answerKey: listeningKey,
        durationMin: 32,
      },
    });
    console.log(`Updated listening test: ${listening.code}`);
  }

  const reading = await prisma.contentTest.findFirst({
    where: { type: ContentTestType.READING, status: ContentTestStatus.PUBLISHED },
    orderBy: { updatedAt: 'desc' },
  });
  if (reading) {
    await prisma.contentTest.update({
      where: { id: reading.id },
      data: {
        content: readingContent,
        answerKey: readingKey,
        durationMin: 60,
      },
    });
    console.log(`Updated reading test: ${reading.code}`);
  }

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
