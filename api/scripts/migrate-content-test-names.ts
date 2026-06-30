/**
 * One-time migration: renumber all content tests to canonical
 * SKILL-MOCK-A### codes and "Skill Mock-A###" titles (ordered by createdAt).
 *
 * Usage: npx tsx scripts/migrate-content-test-names.ts
 */
import {
  ContentTestType,
  PrismaClient,
} from '@prisma/client';
import {
  formatTestCode,
  formatTestTitle,
  syncContentTestId,
} from '../src/modules/content/content-test-naming';

const prisma = new PrismaClient();

const ALL_TYPES: ContentTestType[] = [
  ContentTestType.LISTENING,
  ContentTestType.READING,
  ContentTestType.WRITING,
  ContentTestType.SPEAKING,
];

async function migrateType(type: ContentTestType) {
  const tests = await prisma.contentTest.findMany({
    where: { type },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    select: { id: true, code: true, title: true, content: true },
  });

  for (let index = 0; index < tests.length; index++) {
    const test = tests[index]!;
    const serial = index + 1;
    const code = formatTestCode(type, serial);
    const title = formatTestTitle(type, serial);
    const content = syncContentTestId(test.content, code);

    if (test.code === code && test.title === title) {
      continue;
    }

    await prisma.contentTest.update({
      where: { id: test.id },
      data: { code, title, content: content as object },
    });
    console.log(`  ${test.code} → ${code}  |  ${test.title} → ${title}`);
  }
}

async function main() {
  console.log('Migrating content test codes and titles…');
  for (const type of ALL_TYPES) {
    const count = await prisma.contentTest.count({ where: { type } });
    if (count === 0) continue;
    console.log(`\n${type} (${count} test(s)):`);
    await migrateType(type);
  }
  console.log('\nDone.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
