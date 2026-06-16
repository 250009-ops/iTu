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
