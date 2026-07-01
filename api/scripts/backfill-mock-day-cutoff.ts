/**
 * Backfill mockDayCutoffAt for enrollments created before the mock-day window feature.
 * Run: npx tsx scripts/backfill-mock-day-cutoff.ts
 */
import { PrismaClient } from '@prisma/client';
import {
  DEFAULT_MOCK_DAY_CUTOFF,
  mockDayCutoffDateTime,
} from '../src/common/mock-day-policy';

const prisma = new PrismaClient();

async function main() {
  const rows = await prisma.enrollment.findMany({
    where: { mockDayCutoffAt: null },
    select: { id: true, mockDate: true },
  });
  let updated = 0;
  for (const row of rows) {
    await prisma.enrollment.update({
      where: { id: row.id },
      data: {
        mockDayCutoffAt: mockDayCutoffDateTime(
          row.mockDate,
          DEFAULT_MOCK_DAY_CUTOFF,
        ),
      },
    });
    updated += 1;
  }
  console.log(`Backfilled mockDayCutoffAt for ${updated} enrollment(s).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
