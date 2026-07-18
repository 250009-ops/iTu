import { PracticeCreditType, PracticeUnitType } from '@prisma/client';

export type PracticeBundle = {
  readingPassages?: number;
  readingQuestionTypes?: number;
  listeningSections?: number;
  listeningQuestionTypes?: number;
  aiWritingEssays?: number;
};

export type PracticeDisplayPrices = Partial<Record<keyof PracticeBundle, number>>;

export const PRACTICE_BUNDLE_KEYS: (keyof PracticeBundle)[] = [
  'readingPassages',
  'readingQuestionTypes',
  'listeningSections',
  'listeningQuestionTypes',
  'aiWritingEssays',
];

export function unitTypeToCreditType(
  unitType: PracticeUnitType,
): PracticeCreditType {
  switch (unitType) {
    case 'READING_PASSAGE':
      return PracticeCreditType.READING_PASSAGE;
    case 'READING_QUESTION_TYPE':
      return PracticeCreditType.READING_QUESTION_TYPE;
    case 'LISTENING_SECTION':
      return PracticeCreditType.LISTENING_SECTION;
    case 'LISTENING_QUESTION_TYPE':
      return PracticeCreditType.LISTENING_QUESTION_TYPE;
    default:
      return PracticeCreditType.READING_PASSAGE;
  }
}

export type PracticeWalletBalanceField =
  | 'readingPassages'
  | 'readingQuestionTypes'
  | 'listeningSections'
  | 'listeningQuestionTypes'
  | 'aiWritingEssays';

export function creditTypeToWalletField(
  creditType: PracticeCreditType,
): PracticeWalletBalanceField {
  switch (creditType) {
    case PracticeCreditType.READING_PASSAGE:
      return 'readingPassages';
    case PracticeCreditType.READING_QUESTION_TYPE:
      return 'readingQuestionTypes';
    case PracticeCreditType.LISTENING_SECTION:
      return 'listeningSections';
    case PracticeCreditType.LISTENING_QUESTION_TYPE:
      return 'listeningQuestionTypes';
    case PracticeCreditType.AI_WRITING_ESSAY:
      return 'aiWritingEssays';
    default:
      return 'readingPassages';
  }
}

export function normalizeBundle(raw: unknown): PracticeBundle {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Record<
    string,
    unknown
  >;
  const out: PracticeBundle = {};
  for (const key of PRACTICE_BUNDLE_KEYS) {
    const val = obj[key];
    if (typeof val === 'number' && val > 0) out[key] = Math.floor(val);
  }
  return out;
}

export function bundleTotalCredits(bundle: PracticeBundle): number {
  return PRACTICE_BUNDLE_KEYS.reduce(
    (sum, key) => sum + (bundle[key] ?? 0),
    0,
  );
}
