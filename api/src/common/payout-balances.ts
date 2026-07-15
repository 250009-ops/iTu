import { PayoutStatus } from '@prisma/client';
import {
  formatPayoutPeriodLabel,
  getCurrentPayoutPeriod,
  isPayoutPeriodEligible,
  normalizePayoutSchedule,
  type PayoutSchedule,
} from './payout-period';

export type PayoutBalanceRow = {
  id: string;
  amount: number;
  status: PayoutStatus;
  periodStart: Date;
  periodEnd: Date;
};

export type TeacherPayoutSummary = {
  lockedBalance: number;
  availableBalance: number;
  processingBalance: number;
  eligiblePayoutIds: string[];
  currentPeriod: {
    start: Date;
    end: Date;
    label: string;
  };
  nextUnlockAt: Date | null;
};

export function summarizeTeacherPayouts(
  payouts: PayoutBalanceRow[],
  payoutSchedule: string | undefined,
  now = new Date(),
): TeacherPayoutSummary {
  const schedule = normalizePayoutSchedule(payoutSchedule);
  const { periodStart, periodEnd } = getCurrentPayoutPeriod(schedule, now);
  const currentPeriod = {
    start: periodStart,
    end: periodEnd,
    label: formatPayoutPeriodLabel(schedule, periodStart, periodEnd),
  };

  let lockedBalance = 0;
  let availableBalance = 0;
  let processingBalance = 0;
  const eligiblePayoutIds: string[] = [];
  let nextUnlockAt: Date | null = null;

  for (const payout of payouts) {
    if (payout.status === PayoutStatus.PROCESSING) {
      processingBalance += payout.amount;
      continue;
    }

    if (payout.status !== PayoutStatus.PENDING) {
      continue;
    }

    if (isPayoutPeriodEligible(payout.periodEnd, now)) {
      availableBalance += payout.amount;
      eligiblePayoutIds.push(payout.id);
      continue;
    }

    lockedBalance += payout.amount;
    if (
      !nextUnlockAt ||
      payout.periodEnd.getTime() < nextUnlockAt.getTime()
    ) {
      nextUnlockAt = payout.periodEnd;
    }
  }

  if (lockedBalance > 0 && !nextUnlockAt) {
    nextUnlockAt = currentPeriod.end;
  }

  return {
    lockedBalance,
    availableBalance,
    processingBalance,
    eligiblePayoutIds,
    currentPeriod,
    nextUnlockAt,
  };
}

export function isPayoutRowRequestable(
  status: PayoutStatus,
  periodEnd: Date,
  now = new Date(),
): boolean {
  return (
    status === PayoutStatus.PENDING && isPayoutPeriodEligible(periodEnd, now)
  );
}

export { PayoutSchedule };
