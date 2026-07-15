import { PayoutStatus } from '@prisma/client';
import {
  isPayoutRowRequestable,
  summarizeTeacherPayouts,
  type PayoutBalanceRow,
} from './payout-balances';
import { isPayoutPeriodEligible } from './payout-period';

function row(
  overrides: Partial<PayoutBalanceRow> & Pick<PayoutBalanceRow, 'id'>,
): PayoutBalanceRow {
  return {
    amount: 10_000,
    status: PayoutStatus.PENDING,
    periodStart: new Date('2026-06-01T00:00:00.000Z'),
    periodEnd: new Date('2026-06-15T23:59:59.999Z'),
    ...overrides,
  };
}

describe('isPayoutPeriodEligible', () => {
  it('returns true when period end is in the past', () => {
    expect(
      isPayoutPeriodEligible(
        new Date('2026-06-01T00:00:00.000Z'),
        new Date('2026-06-15T12:00:00.000Z'),
      ),
    ).toBe(true);
  });

  it('returns false when period end is in the future', () => {
    expect(
      isPayoutPeriodEligible(
        new Date('2026-06-30T23:59:59.999Z'),
        new Date('2026-06-15T12:00:00.000Z'),
      ),
    ).toBe(false);
  });
});

describe('summarizeTeacherPayouts', () => {
  const now = new Date('2026-06-15T12:00:00.000Z');

  it('treats PENDING with future periodEnd as locked', () => {
    const summary = summarizeTeacherPayouts(
      [
        row({
          id: 'locked',
          amount: 5_000,
          periodEnd: new Date('2026-06-30T23:59:59.999Z'),
        }),
      ],
      'biweekly',
      now,
    );

    expect(summary.lockedBalance).toBe(5_000);
    expect(summary.availableBalance).toBe(0);
    expect(summary.eligiblePayoutIds).toEqual([]);
  });

  it('treats PENDING with past periodEnd as available', () => {
    const summary = summarizeTeacherPayouts(
      [
        row({
          id: 'available',
          amount: 7_500,
          periodEnd: new Date('2026-06-01T00:00:00.000Z'),
        }),
      ],
      'biweekly',
      now,
    );

    expect(summary.availableBalance).toBe(7_500);
    expect(summary.lockedBalance).toBe(0);
    expect(summary.eligiblePayoutIds).toEqual(['available']);
  });

  it('includes all completed PENDING periods in eligible list', () => {
    const summary = summarizeTeacherPayouts(
      [
        row({
          id: 'p1',
          amount: 3_000,
          periodEnd: new Date('2026-05-15T23:59:59.999Z'),
        }),
        row({
          id: 'p2',
          amount: 4_000,
          periodEnd: new Date('2026-06-01T00:00:00.000Z'),
        }),
      ],
      'biweekly',
      now,
    );

    expect(summary.availableBalance).toBe(7_000);
    expect(summary.eligiblePayoutIds).toEqual(['p1', 'p2']);
  });

  it('splits current-period and completed-period PENDING rows', () => {
    const summary = summarizeTeacherPayouts(
      [
        row({
          id: 'old',
          amount: 2_000,
          periodEnd: new Date('2026-06-01T00:00:00.000Z'),
        }),
        row({
          id: 'current',
          amount: 8_000,
          periodEnd: new Date('2026-06-30T23:59:59.999Z'),
        }),
      ],
      'biweekly',
      now,
    );

    expect(summary.availableBalance).toBe(2_000);
    expect(summary.lockedBalance).toBe(8_000);
    expect(summary.eligiblePayoutIds).toEqual(['old']);
  });

  it('tracks PROCESSING separately without blocking availability', () => {
    const summary = summarizeTeacherPayouts(
      [
        row({
          id: 'processing',
          amount: 1_500,
          status: PayoutStatus.PROCESSING,
          periodEnd: new Date('2026-05-15T23:59:59.999Z'),
        }),
        row({
          id: 'available',
          amount: 6_000,
          periodEnd: new Date('2026-06-01T00:00:00.000Z'),
        }),
      ],
      'biweekly',
      now,
    );

    expect(summary.processingBalance).toBe(1_500);
    expect(summary.availableBalance).toBe(6_000);
    expect(summary.eligiblePayoutIds).toEqual(['available']);
  });

  it('sets nextUnlockAt from earliest locked PENDING period end', () => {
    const summary = summarizeTeacherPayouts(
      [
        row({
          id: 'later',
          amount: 1_000,
          periodEnd: new Date('2026-06-30T23:59:59.999Z'),
        }),
        row({
          id: 'sooner',
          amount: 2_000,
          periodEnd: new Date('2026-06-20T23:59:59.999Z'),
        }),
      ],
      'biweekly',
      now,
    );

    expect(summary.nextUnlockAt?.toISOString()).toBe(
      '2026-06-20T23:59:59.999Z',
    );
  });
});

describe('isPayoutRowRequestable', () => {
  const now = new Date('2026-06-15T12:00:00.000Z');

  it('is false for PENDING rows still in an open period', () => {
    expect(
      isPayoutRowRequestable(
        PayoutStatus.PENDING,
        new Date('2026-06-30T23:59:59.999Z'),
        now,
      ),
    ).toBe(false);
  });

  it('is true for PENDING rows in a completed period', () => {
    expect(
      isPayoutRowRequestable(
        PayoutStatus.PENDING,
        new Date('2026-06-01T00:00:00.000Z'),
        now,
      ),
    ).toBe(true);
  });
});
