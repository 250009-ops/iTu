/**
 * Import the 10 bundled Speaking mock tests into Content Studio.
 * Upserts SPK-MOCK-A001 … SPK-MOCK-A010 as published platform tests.
 *
 * Usage (from api/): npx tsx scripts/import-speaking-mocks.ts
 */
import {
  ContentTestStatus,
  ContentTestType,
  PrismaClient,
} from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import {
  formatTestCode,
  formatTestTitle,
  syncContentTestId,
} from '../src/modules/content/content-test-naming';

const prisma = new PrismaClient();

type SpeakingMockDef = {
  serial: number;
  part1Topics: { title: string; questions: string[] }[];
  cueCard: { title: string; bullets: string[] };
  part3Topics: { title: string; questions: string[] }[];
};

const DEFAULT_PARTS = [
  {
    part: 1,
    title: 'Introduction & interview',
    guidance: '4–5 minutes · familiar topics',
    durationSec: 300,
  },
  {
    part: 2,
    title: 'Individual long turn',
    guidance: '1 min preparation · 2 min talk',
    durationSec: 180,
  },
  {
    part: 3,
    title: 'Two-way discussion',
    guidance: '4–5 minutes · abstract questions',
    durationSec: 300,
  },
];

const PART2_EXAMINER_NOTES = [
  'Give the candidate 1 minute to prepare.',
  'Ask them to speak for 1–2 minutes.',
  'Ask one or two rounding-off questions afterwards.',
];

function loadMocks(): SpeakingMockDef[] {
  const filePath = path.join(__dirname, '..', 'prisma', 'data', 'speaking-mocks.json');
  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as SpeakingMockDef[];
}

function buildContent(code: string, def: SpeakingMockDef): object {
  return syncContentTestId(
    {
      examiner: 'Certified Examiner',
      examinerTitle: 'Speaking Examiner · IELTS Certified',
      slot: '',
      parts: DEFAULT_PARTS,
      cueCard: {
        ...def.cueCard,
        prepSeconds: 60,
        speakSeconds: 120,
      },
      part1Topics: def.part1Topics,
      part3Topics: def.part3Topics,
      part2ExaminerNotes: PART2_EXAMINER_NOTES,
    },
    code,
  ) as object;
}

async function upsertSpeakingMock(def: SpeakingMockDef) {
  const code = formatTestCode(ContentTestType.SPEAKING, def.serial);
  const title = formatTestTitle(ContentTestType.SPEAKING, def.serial);
  const content = buildContent(code, def);

  const existing = await prisma.contentTest.findFirst({
    where: { code, type: ContentTestType.SPEAKING, institutionId: null },
  });

  if (existing) {
    await prisma.contentTest.update({
      where: { id: existing.id },
      data: {
        title,
        content,
        durationMin: 20,
        status: ContentTestStatus.PUBLISHED,
        publishedAt: existing.publishedAt ?? new Date(),
        archivedAt: null,
      },
    });
    console.log(`Updated ${code} (${existing.id})`);
    return existing.id;
  }

  const created = await prisma.contentTest.create({
    data: {
      code,
      title,
      type: ContentTestType.SPEAKING,
      status: ContentTestStatus.PUBLISHED,
      durationMin: 20,
      publishedAt: new Date(),
      institutionId: null,
      content,
    },
  });
  console.log(`Created ${code} (${created.id})`);
  return created.id;
}

async function main() {
  const mocks = loadMocks();
  if (mocks.length !== 10) {
    throw new Error(`Expected 10 speaking mocks, found ${mocks.length}`);
  }

  for (const def of mocks.sort((a, b) => a.serial - b.serial)) {
    await upsertSpeakingMock(def);
  }

  console.log('Speaking mock import complete.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
