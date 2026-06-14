import { PayoutStatus, Prisma } from '@prisma/client';

type CommissionSettings = {
  writingRate?: number;
  speakingRate?: number;
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

  await tx.teacherProfile.update({
    where: { id: teacherId },
    data: {
      totalEarned: { increment: amount },
      totalSessions: { increment: 1 },
    },
  });

  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
    999,
  );

  const existing = await tx.payout.findFirst({
    where: {
      teacherId,
      status: PayoutStatus.PENDING,
      periodStart: { lte: now },
      periodEnd: { gte: now },
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
      status: PayoutStatus.PENDING,
      periodStart,
      periodEnd,
    },
  });
}
