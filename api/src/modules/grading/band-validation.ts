import { BadRequestException } from '@nestjs/common';

/** IELTS bands run 0–9 in half-band steps. */
export function isValidBand(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 9 &&
    Math.round(value * 2) === value * 2
  );
}

const REQUIRED_CRITERIA: Record<'writing' | 'speaking', string[]> = {
  // Task Achievement/Response, Coherence & Cohesion, Lexical Resource,
  // Grammatical Range & Accuracy.
  writing: ['taskAchievement', 'coherenceCohesion', 'lexicalResource', 'grammar'],
  // Fluency & Coherence, Lexical Resource, Grammatical Range & Accuracy,
  // Pronunciation.
  speaking: ['fluencyCoherence', 'lexicalResource', 'grammar', 'pronunciation'],
};

/**
 * Validates a teacher's grade payload: every criteria score and the overall
 * band must be 0–9 in half steps. Throws BadRequestException on any violation.
 * Returns the computed average of the criteria for consistency checks.
 */
export function validateBandScores(
  kind: 'writing' | 'speaking',
  criteriaScores: Record<string, number>,
  overallBand: number,
): void {
  if (!criteriaScores || typeof criteriaScores !== 'object') {
    throw new BadRequestException('criteriaScores must be an object');
  }

  for (const [key, value] of Object.entries(criteriaScores)) {
    if (!isValidBand(value)) {
      throw new BadRequestException(
        `Criterion "${key}" must be a band between 0 and 9 in 0.5 steps`,
      );
    }
  }

  // Warn-level consistency: every required criterion should be present.
  const missing = REQUIRED_CRITERIA[kind].filter(
    (key) => !(key in criteriaScores),
  );
  if (missing.length === REQUIRED_CRITERIA[kind].length) {
    throw new BadRequestException(
      `criteriaScores is missing all ${kind} criteria`,
    );
  }

  if (!isValidBand(overallBand)) {
    throw new BadRequestException(
      'overallBand must be a band between 0 and 9 in 0.5 steps',
    );
  }

  // Overall band should be within a half-band of the rounded criteria average
  // (guards against typos like an overall 9 when criteria average 5).
  const values = Object.values(criteriaScores);
  if (values.length > 0) {
    const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
    const roundedAvg = Math.round(avg * 2) / 2;
    if (Math.abs(roundedAvg - overallBand) > 1) {
      throw new BadRequestException(
        `overallBand (${overallBand}) is inconsistent with the criteria average (~${roundedAvg})`,
      );
    }
  }
}
