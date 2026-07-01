/**
 * Set platform mock-day cutoff to 23:59 and extend active enrollments still on mock day.
 * Run: npx tsx scripts/migrate-day-cutoff-setting.ts
 */
import { PrismaClient } from '@prisma/client';
import {
  DEFAULT_MOCK_DAY_CUTOFF,
  mockDayCutoffDateTime,
} from '../src/common/mock-day-policy';

const prisma = new PrismaClient();

async function main() {
  const row = await prisma.platformSettings.findUnique({
    where: { section: 'exam_timers' },
  });

  if (row) {
    const settings = (row.settings ?? {}) as Record<string, unknown>;
    await prisma.platformSettings.update({
      where: { section: 'exam_timers' },
      data: {
        settings: {
          ...settings,
          dayCutoffTime: DEFAULT_MOCK_DAY_CUTOFF,
        },
      },
    });
    console.log(`Updated exam_timers.dayCutoffTime → ${DEFAULT_MOCK_DAY_CUTOFF}`);
  } else {
    console.log('No saved exam_timers settings; API defaults apply.');
  }

  const active = await prisma.enrollment.findMany({
    where: {
      status: 'ENROLLED',
      mockDayCutoffAt: { not: null },
    },
    select: { id: true, mockDate: true, mockDayCutoffAt: true },
  });

  let extended = 0;
  for (const enrollment of active) {
    const newCutoff = mockDayCutoffDateTime(
      enrollment.mockDate,
      DEFAULT_MOCK_DAY_CUTOFF,
    );
    if (
      enrollment.mockDayCutoffAt &&
      newCutoff.getTime() > enrollment.mockDayCutoffAt.getTime()
    ) {
      await prisma.enrollment.update({
        where: { id: enrollment.id },
        data: { mockDayCutoffAt: newCutoff },
      });
      extended += 1;
    }
  }
  console.log(`Extended mockDayCutoffAt for ${extended} active enrollment(s).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
