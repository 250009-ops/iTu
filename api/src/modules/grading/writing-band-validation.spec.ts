import {
  computeWritingOverallBand,
  validateWritingCriteriaScores,
} from './writing-band-validation';

describe('validateWritingCriteriaScores', () => {
  const payload = {
    task1: {
      taskAchievement: 7,
      coherenceCohesion: 6.5,
      lexicalResource: 7,
      grammar: 6.5,
    },
    task2: {
      taskResponse: 7,
      coherenceCohesion: 7,
      lexicalResource: 7,
      grammar: 7,
    },
  };

  it('passes a consistent per-task writing grade', () => {
    const overall = computeWritingOverallBand(6.5, 7);
    expect(() =>
      validateWritingCriteriaScores(payload, overall),
    ).not.toThrow();
  });

  it('rejects an overall band inconsistent with task bands', () => {
    expect(() => validateWritingCriteriaScores(payload, 9)).toThrow();
  });
});
