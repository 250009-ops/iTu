export const TRAP_TAXONOMY = [
  'paraphrase-miss',
  'keyword-trap',
  'absolute-language',
  'partial-match',
  'opposite-meaning',
  'ng-vs-false',
  'distractor-option',
  'vocab-gap',
] as const;

export type TrapTag = (typeof TRAP_TAXONOMY)[number];

export type EvidenceAnchor = {
  paragraphMarker: string | null;
  sentenceQuote: string;
  degraded?: boolean;
};

export type ParaphrasePair = { question: string; passage: string };

export type QuestionInsight = {
  n: number;
  questionType: string;
  rationale: string;
  evidence: EvidenceAnchor;
  trap: TrapTag | null;
  paraphraseMap: ParaphrasePair[];
  keywords?: string[];
  typeExtras?: Record<string, unknown>;
  options?: { key: string; verdict: string; whyNot: string }[];
  degraded?: boolean;
};

export type GlossaryEntry = {
  paragraphMarker: string | null;
  span: string;
  kind: 'word' | 'phrase' | 'idiom' | 'collocation';
  sense: { en: string; uz?: string; ru?: string };
  pos?: string;
  level?: string;
};

export type VocabItem = {
  word: string;
  contextMeaning: string;
  collocations: string[];
  wordFamily: string[];
  ieltsParaphrases: string[];
  occurrenceAnchor: EvidenceAnchor;
};

export type ParaphraseDrill = {
  n: number;
  type: 'synonym-swap' | 'restructure' | 'academic-register';
  prompt: string;
  acceptedAnswers: string[];
  explanation: string;
};

export type SkimTask = {
  paragraphMarker: string | null;
  mainIdeaQuestion: string;
  options: string[];
  correct: number;
};

export type ScanTask = {
  id: string;
  prompt: string;
  targetQuote: string;
  paragraphMarker: string | null;
  expectedSeconds: number;
};

export type StrategySpecialization = {
  questionType: string;
  orderOfAttackReason?: string;
  questions: {
    n: number;
    keywords?: string[];
    tapTargets?: EvidenceAnchor[];
    distractorNotes?: string[];
    extras?: Record<string, unknown>;
  }[];
};

export type StrategyPlaybook = {
  groupOrder: string[];
  specializations: StrategySpecialization[];
};

export type AiPackSectionKey =
  | 'insights'
  | 'glossary'
  | 'vocab'
  | 'drills'
  | 'skimScan'
  | 'playbook';

export type SectionStatus = 'pending' | 'ready' | 'degraded' | 'failed';

export type PassageParagraph = {
  marker?: string;
  text: string;
};

export type ReadingPassageLike = {
  title?: string;
  paragraphs: PassageParagraph[];
  groups?: { type: string; questions?: { n: number; prompt?: string }[] }[];
};
