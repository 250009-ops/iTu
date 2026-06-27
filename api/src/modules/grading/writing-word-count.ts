export const WRITING_MIN_WORDS = {
  task1: 150,
  task2: 250,
} as const;

export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}

/** Cap Task Achievement / Task Response when the essay is under the IELTS minimum. */
export function capPrimaryScoreForWordCount(
  primaryScore: number,
  wordCount: number,
  minWords: number,
): number {
  if (wordCount >= minWords) return primaryScore;

  const ratio = wordCount / minWords;
  let maxPrimary: number;
  if (ratio >= 0.8) maxPrimary = 5;
  else if (ratio >= 0.6) maxPrimary = 4.5;
  else if (ratio >= 0.4) maxPrimary = 4;
  else maxPrimary = 3;

  return Math.min(primaryScore, maxPrimary);
}

export function applyWordCountPenaltyToScores(
  scores: Record<string, number>,
  primaryKey: 'taskAchievement' | 'taskResponse',
  wordCount: number,
  minWords: number,
): Record<string, number> {
  if (wordCount >= minWords) return scores;

  const primary = scores[primaryKey];
  if (typeof primary !== 'number') return scores;

  return {
    ...scores,
    [primaryKey]: capPrimaryScoreForWordCount(primary, wordCount, minWords),
  };
}
