import { ExamSkill } from '@prisma/client';
import { packageExamSkills } from '../modules/content/package-skills';

/** Canonical key for a skill set — drives separate mock-number sequences. */
export function derivePackageKind(skills: unknown): string {
  return packageExamSkills(skills)
    .map((s) => s.toLowerCase())
    .join('+');
}

const KIND_LABELS: Record<string, string> = {
  'listening+reading+writing+speaking': 'Full Mock',
  listening: 'Listening Only',
  reading: 'Reading Only',
  writing: 'Writing Only',
  speaking: 'Speaking Only',
  'listening+reading': 'Listening & Reading',
  'writing+speaking': 'Writing & Speaking',
};

export function packageKindLabel(kind: string): string {
  return KIND_LABELS[kind] ?? kind.replace(/\+/g, ' + ');
}

export function formatMockNumber(kind: string, mockNumber: number): string {
  return `${packageKindLabel(kind)} ${String(mockNumber).padStart(3, '0')}`;
}

export const SKILL_TO_TEST_FIELD = {
  LISTENING: 'listeningTestId',
  READING: 'readingTestId',
  WRITING: 'writingTestId',
  SPEAKING: 'speakingBankId',
} as const satisfies Record<
  ExamSkill,
  'listeningTestId' | 'readingTestId' | 'writingTestId' | 'speakingBankId'
>;

export const SKILL_TO_POOL_KEY = {
  LISTENING: 'listening',
  READING: 'reading',
  WRITING: 'writing',
  SPEAKING: 'speaking',
} as const satisfies Record<
  ExamSkill,
  'listening' | 'reading' | 'writing' | 'speaking'
>;
