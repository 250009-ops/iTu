/**
 * Removes prisma-seed demo teacher payouts ($325 / $210 / $890 for
 * @example.com seed teachers) and recalculates their totalEarned.
 *
 * Usage (from api/):
 *   npx tsx scripts/purge-seed-demo-payouts.ts
 *   npx tsx scripts/purge-seed-demo-payouts.ts --dry-run
 */
import { PrismaClient } from '@prisma/client';

const SEED_DEMO_TEACHER_EMAILS = [
  'teacher@example.com',
  'emma.williams@example.com',
  'daniel.whitfield@example.com',
] as const;

const SEED_DEMO_PAYOUT_AMOUNTS = [325, 210, 890] as const;

const dryRun = process.argv.includes('--dry-run');
const prisma = new PrismaClient();

async function main() {
  const teachers = await prisma.teacherProfile.findMany({
    where: { user: { email: { in: [...SEED_DEMO_TEACHER_EMAILS] } } },
    select: {
      id: true,
      totalEarned: true,
      user: { select: { email: true, name: true } },
    },
  });

  if (teachers.length === 0) {
    console.log('No seed demo teachers found. Nothing to purge.');
    return;
  }

  const matches = await prisma.payout.findMany({
    where: {
      teacherId: { in: teachers.map((t) => t.id) },
      amount: { in: [...SEED_DEMO_PAYOUT_AMOUNTS] },
    },
    select: {
      id: true,
      amount: true,
      status: true,
      teacher: { select: { user: { select: { email: true, name: true } } } },
    },
  });

  console.log(
    dryRun
      ? `Dry run — would delete ${matches.length} payout(s):`
      : `Deleting ${matches.length} seed demo payout(s):`,
  );
  for (const row of matches) {
    console.log(
      `  - ${row.teacher.user.name} <${row.teacher.user.email}> $${row.amount} (${row.status})`,
    );
  }

  if (dryRun || matches.length === 0) return;

  await prisma.$transaction(async (tx) => {
    await tx.payout.deleteMany({
      where: { id: { in: matches.map((m) => m.id) } },
    });

    for (const teacher of teachers) {
      const remaining = await tx.payout.aggregate({
        where: { teacherId: teacher.id },
        _sum: { amount: true },
      });
      const nextEarned = remaining._sum.amount ?? 0;
      await tx.teacherProfile.update({
        where: { id: teacher.id },
        data: { totalEarned: nextEarned },
      });
      console.log(
        `  totalEarned ${teacher.user.email}: ${teacher.totalEarned} → ${nextEarned}`,
      );
    }
  });

  console.log('Done.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
