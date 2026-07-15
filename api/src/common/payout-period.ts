export type PayoutSchedule = 'weekly' | 'biweekly' | 'monthly';

export function getPayoutPeriod(
  schedule: PayoutSchedule,
  date = new Date(),
): { periodStart: Date; periodEnd: Date } {
  if (schedule === 'monthly') {
    return {
      periodStart: new Date(date.getFullYear(), date.getMonth(), 1),
      periodEnd: new Date(
        date.getFullYear(),
        date.getMonth() + 1,
        0,
        23,
        59,
        59,
        999,
      ),
    };
  }

  if (schedule === 'weekly') {
    const day = date.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const periodStart = new Date(date);
    periodStart.setDate(date.getDate() + mondayOffset);
    periodStart.setHours(0, 0, 0, 0);
    const periodEnd = new Date(periodStart);
    periodEnd.setDate(periodStart.getDate() + 6);
    periodEnd.setHours(23, 59, 59, 999);
    return { periodStart, periodEnd };
  }

  // biweekly: 1st–15th and 16th–end of month
  if (date.getDate() <= 15) {
    return {
      periodStart: new Date(date.getFullYear(), date.getMonth(), 1),
      periodEnd: new Date(
        date.getFullYear(),
        date.getMonth(),
        15,
        23,
        59,
        59,
        999,
      ),
    };
  }

  return {
    periodStart: new Date(date.getFullYear(), date.getMonth(), 16),
    periodEnd: new Date(
      date.getFullYear(),
      date.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    ),
  };
}

export function normalizePayoutSchedule(value?: string): PayoutSchedule {
  if (value === 'weekly' || value === 'biweekly' || value === 'monthly') {
    return value;
  }
  return 'weekly';
}

/** True when the earnings period has ended and the balance may be requested. */
export function isPayoutPeriodEligible(
  periodEnd: Date,
  now = new Date(),
): boolean {
  return periodEnd.getTime() <= now.getTime();
}

export function getCurrentPayoutPeriod(
  schedule: PayoutSchedule,
  now = new Date(),
): { periodStart: Date; periodEnd: Date } {
  return getPayoutPeriod(schedule, now);
}

export function formatPayoutPeriodLabel(
  schedule: PayoutSchedule,
  periodStart: Date,
  periodEnd: Date,
): string {
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

  if (schedule === 'monthly') {
    return `${periodStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
  }

  if (schedule === 'weekly') {
    return `${fmt(periodStart)} – ${fmt(periodEnd)}`;
  }

  // biweekly: 1st–15th or 16th–end
  return `${fmt(periodStart)} – ${fmt(periodEnd)}`;
}
