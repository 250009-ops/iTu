/**
 * One-time cleanup for Passage 1 practice units:
 * - Delete empty draft units (PRA-REA-P1-008 … P1-011)
 * - Swap PRA-REA-P1-012 ↔ PRA-REA-P1-004 so the College Degree unit uses slot 004
 *
 * Usage (from api/):
 *   npx tsx scripts/fix-practice-passage-p1.ts           # dry-run
 *   npx tsx scripts/fix-practice-passage-p1.ts --apply
 */
import { ContentTestStatus, PracticeUnitType, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const EMPTY_DRAFT_CODES = [
  'PRA-REA-P1-008',
  'PRA-REA-P1-009',
  'PRA-REA-P1-010',
  'PRA-REA-P1-011',
];

const TARGET_CODE = 'PRA-REA-P1-004';
const MISTAKE_CODE = 'PRA-REA-P1-012';

async function main() {
  const apply = process.argv.includes('--apply');

  const drafts = await prisma.practiceUnit.findMany({
    where: {
      type: PracticeUnitType.READING_PASSAGE,
      code: { in: EMPTY_DRAFT_CODES },
    },
    select: { id: true, code: true, status: true, questionCount: true, title: true },
  });

  const slot004 = await prisma.practiceUnit.findUnique({
    where: { code: TARGET_CODE },
    select: { id: true, code: true, title: true, questionCount: true, status: true },
  });

  const slot012 = await prisma.practiceUnit.findUnique({
    where: { code: MISTAKE_CODE },
    select: { id: true, code: true, title: true, questionCount: true, status: true },
  });

  console.log(`${apply ? 'Applying' : 'Dry-run for'} Passage 1 practice cleanup:\n`);

  if (drafts.length === 0) {
    console.log('  No empty draft units to delete.');
  } else {
    for (const unit of drafts) {
      console.log(
        `  DELETE ${unit.code} (${unit.status}, ${unit.questionCount} questions)`,
      );
    }
  }

  if (slot012 && slot004 && slot012.id !== slot004.id) {
    console.log(`  SWAP ${MISTAKE_CODE} ↔ ${TARGET_CODE}`);
    console.log(`    ${MISTAKE_CODE}: "${slot012.title}" (${slot012.questionCount} q)`);
    console.log(`    ${TARGET_CODE}: "${slot004.title}" (${slot004.questionCount} q)`);
  } else if (slot012 && !slot004) {
    console.log(`  RENAME ${MISTAKE_CODE} → ${TARGET_CODE}`);
  } else if (!slot012) {
    console.log(`  ${MISTAKE_CODE} not found — swap skipped.`);
  } else {
    console.log('  Codes already aligned — swap skipped.');
  }

  if (!apply) {
    console.log('\nNo changes written. Re-run with --apply to execute.');
    return;
  }

  await prisma.$transaction(async (tx) => {
    for (const unit of drafts) {
      if (unit.status !== ContentTestStatus.DRAFT) {
        console.warn(`  Skipped delete ${unit.code} — not a draft.`);
        continue;
      }
      await tx.practiceUnit.delete({ where: { id: unit.id } });
    }

    if (slot012 && slot004 && slot012.id !== slot004.id) {
      await tx.practiceUnit.update({
        where: { id: slot004.id },
        data: { code: `MIGTMP-${slot004.id}` },
      });
      await tx.practiceUnit.update({
        where: { id: slot012.id },
        data: { code: `MIGTMP-${slot012.id}` },
      });
      await tx.practiceUnit.update({
        where: { id: slot012.id },
        data: { code: TARGET_CODE },
      });
      await tx.practiceUnit.update({
        where: { id: slot004.id },
        data: { code: MISTAKE_CODE },
      });
    } else if (slot012 && !slot004) {
      await tx.practiceUnit.update({
        where: { id: slot012.id },
        data: { code: TARGET_CODE },
      });
    }
  });

  console.log('\nDone.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
