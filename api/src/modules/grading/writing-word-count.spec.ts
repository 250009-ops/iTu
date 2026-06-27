import {
  applyWordCountPenaltyToScores,
  capPrimaryScoreForWordCount,
  countWords,
} from './writing-word-count';

describe('writing-word-count', () => {
  it('counts words in an essay', () => {
    expect(countWords('one two three')).toBe(3);
    expect(countWords('')).toBe(0);
  });

  it('caps primary score when Task 2 is far below 250 words', () => {
    expect(capPrimaryScoreForWordCount(6.5, 128, 250)).toBe(4);
  });

  it('does not cap when minimum is met', () => {
    expect(capPrimaryScoreForWordCount(6.5, 250, 250)).toBe(6.5);
  });

  it('applies penalty only to the primary criterion', () => {
    const scores = {
      taskResponse: 6.5,
      coherenceCohesion: 6,
      lexicalResource: 7,
      grammar: 6,
    };
    const adjusted = applyWordCountPenaltyToScores(
      scores,
      'taskResponse',
      128,
      250,
    );
    expect(adjusted.taskResponse).toBe(4);
    expect(adjusted.lexicalResource).toBe(7);
  });
});
