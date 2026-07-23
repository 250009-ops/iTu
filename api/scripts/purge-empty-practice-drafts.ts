/**
 * Remove abandoned practice drafts with zero questions (empty shells from
 * repeated "New Passage / Section / Drill" clicks).
 *
 * Usage (from api/):
 *   npx tsx scripts/purge-empty-practice-drafts.ts           # dry-run
 *   npx tsx scripts/purge-empty-practice-drafts.ts --apply
 */
import { ContentTestStatus, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const apply = process.argv.includes('--apply');

  const emptyDrafts = await prisma.practiceUnit.findMany({
    where: {
      status: ContentTestStatus.DRAFT,
      questionCount: 0,
    },
    orderBy: [{ code: 'asc' }],
    select: { id: true, code: true, type: true, title: true, questionCount: true },
  });

  if (emptyDrafts.length === 0) {
    console.log('No empty practice drafts to purge.');
    return;
  }

  console.log(
    `${apply ? 'Applying' : 'Dry-run'} — ${emptyDrafts.length} empty draft(s):\n`,
  );
  for (const unit of emptyDrafts) {
    console.log(`  DELETE ${unit.code} (${unit.type})`);
  }

  if (!apply) {
    console.log('\nNo changes written. Re-run with --apply to purge.');
    return;
  }

  const result = await prisma.practiceUnit.deleteMany({
    where: {
      status: ContentTestStatus.DRAFT,
      questionCount: 0,
    },
  });

  console.log(`\nPurged ${result.count} empty practice draft(s).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
