import { ExamType } from '@prisma/client';

const FULL_KIND = 'listening+reading+writing+speaking';

export type PackageContentTemplate = {
  description: string;
  included: string[];
  rules: string[];
  suggestedPrice: number;
};

function fullMockTemplate(examType: ExamType): PackageContentTemplate {
  if (examType === ExamType.GENERAL_TRAINING) {
    return {
      description:
        'All four skills. IELTS General Training — for migration, permanent residency, and work programs.',
      suggestedPrice: 45,
      included: [
        'Pick your certified examiner',
        'Full band report within 24 hours',
        'Criteria-level written feedback',
        'Score progression tracking',
        'Secure exam environment',
      ],
      rules: [
        'No pause or rewind',
        'Server-authoritative timers',
        'Strict exam-day integrity',
        'All scores released together',
      ],
    };
  }
  return {
    description:
      'All four skills in one day. IELTS Academic — for university, visa, and professional registration.',
    suggestedPrice: 49,
    included: [
      'Pick your certified examiner',
      'Full band report within 24 hours',
      'Criteria-level written feedback',
      'Score progression tracking',
      'Secure exam environment',
    ],
    rules: [
      'No pause or rewind',
      'Server-authoritative timers',
      'Strict exam-day integrity',
      'All scores released together',
    ],
  };
}

const TEMPLATES: Record<string, PackageContentTemplate> = {
  speaking: {
    description:
      'A single live Speaking session with a certified examiner, with criteria-level feedback.',
    suggestedPrice: 22,
    included: [
      'Pick your certified examiner',
      'Speaking score within 24 hours',
      'Criteria-level speaking feedback',
      'Part 1, 2 & 3 transcript notes',
    ],
    rules: [
      'Live video session',
      '11–14 minutes',
      'Recorded for examiner reference',
    ],
  },
  writing: {
    description:
      'Task 1 + Task 2 graded by a certified examiner with full criteria-level written feedback.',
    suggestedPrice: 18,
    included: [
      'Expert examiner grading',
      'Task 1 + Task 2 feedback',
      'Criteria-level breakdown',
      'Turnaround within 24 hours',
    ],
    rules: ['60-minute window', 'Live word counter', 'Spell-check disabled'],
  },
  listening: {
    description:
      'Computer-delivered Listening mock with auto-scoring and official CBT timing.',
    suggestedPrice: 25,
    included: [
      '40 questions · 4 parts',
      'Auto-scored band estimate',
      'Official CBT interface',
      'Secure exam environment',
    ],
    rules: [
      'No pause or rewind',
      'Server-authoritative timer',
      'Single sitting required',
    ],
  },
  reading: {
    description:
      'Computer-delivered Reading mock with auto-scoring and official CBT timing.',
    suggestedPrice: 25,
    included: [
      '40 questions · 3 passages',
      'Auto-scored band estimate',
      'Official CBT interface',
      'Secure exam environment',
    ],
    rules: [
      '60-minute window',
      'Server-authoritative timer',
      'Single sitting required',
    ],
  },
};

export function getPackageContentTemplate(
  packageKind: string,
  examType: ExamType = ExamType.ACADEMIC,
): PackageContentTemplate {
  if (packageKind === FULL_KIND) {
    return fullMockTemplate(examType);
  }
  return (
    TEMPLATES[packageKind] ?? {
      description: '',
      suggestedPrice: 0,
      included: [],
      rules: [],
    }
  );
}
