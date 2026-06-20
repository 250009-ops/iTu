import { BadRequestException } from '@nestjs/common';
import { isValidBand } from './band-validation';

export type WritingTaskScores = {
  taskAchievement?: number;
  taskResponse?: number;
  coherenceCohesion: number;
  lexicalResource: number;
  grammar: number;
  taskBand?: number;
  feedback?: string;
};

export type WritingCriteriaScoresPayload = {
  task1: WritingTaskScores;
  task2: WritingTaskScores;
};

const TASK1_KEYS = [
  'taskAchievement',
  'coherenceCohesion',
  'lexicalResource',
  'grammar',
] as const;

const TASK2_KEYS = [
  'taskResponse',
  'coherenceCohesion',
  'lexicalResource',
  'grammar',
] as const;

export function averageTaskBand(scores: Record<string, number>): number {
  const values = Object.values(scores);
  if (!values.length) return 0;
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  return Math.round(avg * 2) / 2;
}

/** IELTS Writing overall: Task 2 counts double. */
export function computeWritingOverallBand(
  task1Band: number,
  task2Band: number,
): number {
  const weighted = (task1Band + task2Band * 2) / 3;
  return Math.round(weighted * 2) / 2;
}

export function isPerTaskCriteriaScores(
  criteriaScores: Record<string, unknown>,
): criteriaScores is WritingCriteriaScoresPayload {
  return (
    typeof criteriaScores.task1 === 'object' &&
    criteriaScores.task1 !== null &&
    typeof criteriaScores.task2 === 'object' &&
    criteriaScores.task2 !== null
  );
}

function validateTaskScores(
  taskKey: 'task1' | 'task2',
  task: WritingTaskScores,
): number {
  const requiredKeys = taskKey === 'task1' ? TASK1_KEYS : TASK2_KEYS;
  const scores: Record<string, number> = {};

  for (const key of requiredKeys) {
    const value = task[key as keyof WritingTaskScores];
    if (typeof value !== 'number' || !isValidBand(value)) {
      throw new BadRequestException(
        `${taskKey}.${key} must be a band between 0 and 9 in 0.5 steps`,
      );
    }
    scores[key] = value;
  }

  return averageTaskBand(scores);
}

export function validateWritingCriteriaScores(
  criteriaScores: Record<string, unknown>,
  overallBand: number,
): WritingCriteriaScoresPayload {
  if (!isPerTaskCriteriaScores(criteriaScores)) {
    throw new BadRequestException(
      'criteriaScores must include task1 and task2 objects',
    );
  }

  const task1Band = validateTaskScores('task1', criteriaScores.task1);
  const task2Band = validateTaskScores('task2', criteriaScores.task2);
  const expectedOverall = computeWritingOverallBand(task1Band, task2Band);

  if (!isValidBand(overallBand)) {
    throw new BadRequestException(
      'overallBand must be a band between 0 and 9 in 0.5 steps',
    );
  }

  if (Math.abs(expectedOverall - overallBand) > 0.5) {
    throw new BadRequestException(
      `overallBand (${overallBand}) is inconsistent with task bands (expected ~${expectedOverall})`,
    );
  }

  return {
    task1: {
      ...criteriaScores.task1,
      taskBand: task1Band,
    },
    task2: {
      ...criteriaScores.task2,
      taskBand: task2Band,
    },
  };
}
