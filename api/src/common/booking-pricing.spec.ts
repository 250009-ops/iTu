import {
  computeBookingPrice,
  computeFromPrice,
  packageIsExaminerPriced,
} from './booking-pricing';

describe('booking-pricing', () => {
  it('prices writing-only from writing examiner gross', () => {
    const result = computeBookingPrice({
      skills: ['writing'],
      writingGross: 10_000,
    });
    expect(result.complete).toBe(true);
    expect(result.examinerPriced).toBe(true);
    expect(result.amount).toBe(10_000);
    expect(result.breakdown).toEqual({
      listening: 0,
      reading: 0,
      writing: 10_000,
      speaking: 0,
    });
  });

  it('prices speaking-only from speaking examiner gross', () => {
    const result = computeBookingPrice({
      skills: ['speaking'],
      speakingGross: 18_000,
    });
    expect(result.amount).toBe(18_000);
  });

  it('prices full mock as L+R fees plus examiner gross rates', () => {
    const result = computeBookingPrice({
      skills: ['listening', 'reading', 'writing', 'speaking'],
      writingGross: 10_000,
      speakingGross: 18_000,
    });
    expect(result.amount).toBe(8_000 + 8_000 + 10_000 + 18_000);
    expect(result.breakdown.listening).toBe(8_000);
    expect(result.breakdown.reading).toBe(8_000);
  });

  it('prices listening-only from package.price when provided', () => {
    const result = computeBookingPrice({
      skills: ['listening'],
      packagePrice: 20_000,
    });
    expect(result.examinerPriced).toBe(false);
    expect(result.amount).toBe(20_000);
    expect(result.complete).toBe(true);
  });

  it('falls back to catalog fee for listening-only without packagePrice', () => {
    const result = computeBookingPrice({ skills: ['listening'] });
    expect(result.amount).toBe(8_000);
  });

  it('is incomplete until required examiner rates are present', () => {
    const result = computeBookingPrice({
      skills: ['writing', 'speaking'],
      writingGross: 12_000,
    });
    expect(result.complete).toBe(false);
    expect(result.missing).toEqual(['speaking']);
    expect(result.amount).toBe(0);
  });

  it('marks packages with W/S as examiner-priced', () => {
    expect(packageIsExaminerPriced(['writing'])).toBe(true);
    expect(packageIsExaminerPriced(['listening'])).toBe(false);
  });

  it('computes from-price with min examiner rates', () => {
    const result = computeFromPrice({
      skills: ['listening', 'reading', 'writing', 'speaking'],
      writingMinGross: 10_000,
      speakingMinGross: 12_000,
    });
    expect(result.amount).toBe(8_000 + 8_000 + 10_000 + 12_000);
  });
});
