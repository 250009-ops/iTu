import { PayoutStatus, Prisma } from '@prisma/client';
import { CATALOG_CURRENCY } from './catalog-pricing';
import {
  getPayoutPeriod,
  normalizePayoutSchedule,
  type PayoutSchedule,
} from './payout-period';

type CommissionSettings = {
  writingRate?: number;
  speakingRate?: number;
  payoutSchedule?: string;
};

export async function accrueTeacherGradingEarning(
  tx: Prisma.TransactionClient,
  teacherId: string,
  skill: 'writing' | 'speaking',
  commission: CommissionSettings,
) {
  const amount =
    skill === 'writing'
      ? (commission.writingRate ?? 35)
      : (commission.speakingRate ?? 25);

  // Institution-scoped examiners are paid by their center off-platform, so they
  // accrue session counts but never platform earnings or payout rows.
  const teacher = await tx.teacherProfile.findUnique({
    where: { id: teacherId },
    select: { institutionId: true },
  });
  if (teacher?.institutionId) {
    await tx.teacherProfile.update({
      where: { id: teacherId },
      data: { totalSessions: { increment: 1 } },
    });
    return;
  }

  await tx.teacherProfile.update({
    where: { id: teacherId },
    data: {
      totalEarned: { increment: amount },
      totalSessions: { increment: 1 },
    },
  });

  const schedule = normalizePayoutSchedule(commission.payoutSchedule);
  const { periodStart, periodEnd } = getPayoutPeriod(schedule);
  const now = new Date();

  const existing = await tx.payout.findFirst({
    where: {
      teacherId,
      status: PayoutStatus.PENDING,
      periodStart,
      periodEnd,
    },
  });

  if (existing) {
    await tx.payout.update({
      where: { id: existing.id },
      data: { amount: { increment: amount } },
    });
    return;
  }

  await tx.payout.create({
    data: {
      teacherId,
      amount,
      currency: CATALOG_CURRENCY,
      status: PayoutStatus.PENDING,
      periodStart,
      periodEnd,
    },
  });
}

export { PayoutSchedule };
