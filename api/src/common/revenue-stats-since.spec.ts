import {
  laterDate,
  resolveRevenueStatsSince,
  revenueCreatedAtGte,
} from './revenue-stats-since';

describe('resolveRevenueStatsSince', () => {
  it('returns null when unset or blank', () => {
    expect(resolveRevenueStatsSince(undefined)).toBeNull();
    expect(resolveRevenueStatsSince('')).toBeNull();
    expect(resolveRevenueStatsSince('   ')).toBeNull();
  });

  it('parses ISO-8601 with Asia/Tashkent offset', () => {
    const since = resolveRevenueStatsSince('2026-08-04T00:00:00+05:00');
    expect(since).toEqual(new Date('2026-08-03T19:00:00.000Z'));
  });

  it('throws on invalid values', () => {
    expect(() => resolveRevenueStatsSince('not-a-date')).toThrow(
      /Invalid REVENUE_STATS_SINCE/,
    );
  });
});

describe('revenueCreatedAtGte', () => {
  it('omits filter when there is no cutoff', () => {
    expect(revenueCreatedAtGte(null)).toBeUndefined();
  });

  it('returns gte when cutoff is set', () => {
    const since = new Date('2026-08-03T19:00:00.000Z');
    expect(revenueCreatedAtGte(since)).toEqual({ gte: since });
  });
});

describe('laterDate', () => {
  it('returns a when b is null', () => {
    const a = new Date('2026-03-01T00:00:00.000Z');
    expect(laterDate(a, null)).toBe(a);
  });

  it('returns the later of two dates', () => {
    const early = new Date('2026-03-01T00:00:00.000Z');
    const late = new Date('2026-08-04T00:00:00.000Z');
    expect(laterDate(early, late)).toBe(late);
    expect(laterDate(late, early)).toBe(late);
  });
});
