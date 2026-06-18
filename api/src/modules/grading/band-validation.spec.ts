import { isValidBand, validateBandScores } from './band-validation';

describe('isValidBand', () => {
  it('accepts 0–9 in half steps', () => {
    expect(isValidBand(0)).toBe(true);
    expect(isValidBand(6.5)).toBe(true);
    expect(isValidBand(9)).toBe(true);
  });
  it('rejects out-of-range and non-half steps', () => {
    expect(isValidBand(-1)).toBe(false);
    expect(isValidBand(9.5)).toBe(false);
    expect(isValidBand(6.3)).toBe(false);
    expect(isValidBand('6' as unknown)).toBe(false);
  });
});

describe('validateBandScores', () => {
  const writing = {
    taskAchievement: 6,
    coherenceCohesion: 6.5,
    lexicalResource: 6,
    grammar: 6.5,
  };

  it('passes a consistent writing grade', () => {
    expect(() => validateBandScores('writing', writing, 6.5)).not.toThrow();
  });

  it('rejects an out-of-step criterion', () => {
    expect(() =>
      validateBandScores('writing', { ...writing, grammar: 6.3 }, 6.5),
    ).toThrow();
  });

  it('rejects an overall band wildly inconsistent with criteria', () => {
    expect(() => validateBandScores('writing', writing, 9)).toThrow();
  });

  it('rejects when all required criteria are missing', () => {
    expect(() =>
      validateBandScores('speaking', { somethingElse: 6 }, 6),
    ).toThrow();
  });
});
