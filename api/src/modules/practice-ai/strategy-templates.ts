/**
 * Hand-authored IELTS Reading strategy templates per question type.
 * AI pack specialization fills passage-specific keywords/anchors only.
 */

export type StrategyStep = {
  id: string;
  title: string;
  instruction: string;
  studentAction:
    | 'watch'
    | 'tap-keywords'
    | 'tap-paragraph'
    | 'choose-chip'
    | 'decide'
    | 'type-answer';
};

export type StrategyTemplate = {
  questionType: string;
  label: string;
  decisionRule: string;
  traps: string[];
  steps: StrategyStep[];
  hintLadder: { level: 1 | 2 | 3; label: string; instruction: string }[];
};

const commonHints = (
  locateHint: string,
): StrategyTemplate['hintLadder'] => [
  {
    level: 1,
    label: 'Keyword',
    instruction: locateHint,
  },
  {
    level: 2,
    label: 'Sentence',
    instruction: 'Highlight the evidence sentence in the passage.',
  },
  {
    level: 3,
    label: 'Answer',
    instruction: 'Reveal the correct answer and short rationale.',
  },
];

export const READING_STRATEGY_TEMPLATES: Record<string, StrategyTemplate> = {
  tfng: {
    questionType: 'tfng',
    label: 'True / False / Not Given',
    decisionRule:
      'True = matches the passage. False = passage states the opposite. Not Given = passage is silent on this specific claim.',
    traps: ['ng-vs-false', 'absolute-language', 'partial-match'],
    steps: [
      {
        id: 'read',
        title: 'Read the statement',
        instruction: 'Underline content words. Circle qualifiers like all, only, always, most.',
        studentAction: 'watch',
      },
      {
        id: 'keywords',
        title: 'Mark scan keywords',
        instruction: 'Tap 2–3 keywords you would scan for in the passage.',
        studentAction: 'tap-keywords',
      },
      {
        id: 'locate',
        title: 'Locate the claim',
        instruction: 'Answers usually follow passage order. Tap the paragraph that covers this claim.',
        studentAction: 'tap-paragraph',
      },
      {
        id: 'paraphrase',
        title: 'Match paraphrase',
        instruction: 'Compare statement wording with the evidence sentence side by side.',
        studentAction: 'watch',
      },
      {
        id: 'decide',
        title: 'Decide True / False / NG',
        instruction: 'Ask: opposite, or just not said? Then choose.',
        studentAction: 'decide',
      },
    ],
    hintLadder: commonHints('Scan for the keywords and qualifier words in the statement.'),
  },
  yng: {
    questionType: 'yng',
    label: 'Yes / No / Not Given',
    decisionRule:
      'Yes = the writer holds this view. No = the writer holds the opposite view. NG = the writer expresses no view (even if the topic appears as fact).',
    traps: ['ng-vs-false', 'keyword-trap'],
    steps: [
      {
        id: 'view',
        title: 'Is this a view?',
        instruction: 'Look for opinion markers: argues, suggests, believes, claims.',
        studentAction: 'watch',
      },
      {
        id: 'keywords',
        title: 'Mark keywords',
        instruction: 'Tap keywords that carry the writer’s claim.',
        studentAction: 'tap-keywords',
      },
      {
        id: 'locate',
        title: 'Find the writer’s stance',
        instruction: 'Tap the paragraph that states the writer’s view on this idea.',
        studentAction: 'tap-paragraph',
      },
      {
        id: 'decide',
        title: 'Decide Yes / No / NG',
        instruction: 'Fact about the topic ≠ writer’s view. Choose carefully.',
        studentAction: 'decide',
      },
    ],
    hintLadder: commonHints('Scan for opinion markers near the topic keywords.'),
  },
  matching_headings: {
    questionType: 'matching_headings',
    label: 'Matching Headings',
    decisionRule: 'A heading must name the paragraph theme, not a detail inside it.',
    traps: ['keyword-trap', 'partial-match'],
    steps: [
      {
        id: 'headings',
        title: 'Read all headings first',
        instruction: 'Spot near-duplicate headings and note how they differ.',
        studentAction: 'watch',
      },
      {
        id: 'topic',
        title: 'Find the topic sentence',
        instruction: 'Read first and last sentences. Tap the sentence that carries the main idea.',
        studentAction: 'tap-paragraph',
      },
      {
        id: 'theme',
        title: 'Name the theme',
        instruction: 'Pick the 5-word theme chip — avoid detail-only options.',
        studentAction: 'choose-chip',
      },
      {
        id: 'match',
        title: 'Match the heading',
        instruction: 'Choose the heading that matches the theme, not a shared keyword.',
        studentAction: 'decide',
      },
    ],
    hintLadder: commonHints('Focus on the first and last sentences of the paragraph.'),
  },
  matching_information: {
    questionType: 'matching_information',
    label: 'Matching Information',
    decisionRule: 'The paragraph must contain the information itself, not merely the subject.',
    traps: ['keyword-trap', 'partial-match'],
    steps: [
      {
        id: 'type',
        title: 'Label the info type',
        instruction: 'Is it a reason, example, comparison, prediction, or description?',
        studentAction: 'choose-chip',
      },
      {
        id: 'keywords',
        title: 'Keywords & paraphrases',
        instruction: 'Tap keywords — answers are NOT in order for this type.',
        studentAction: 'tap-keywords',
      },
      {
        id: 'locate',
        title: 'Scan any paragraph',
        instruction: 'Tap the paragraph that contains the information, not just the topic.',
        studentAction: 'tap-paragraph',
      },
      {
        id: 'decide',
        title: 'Confirm match',
        instruction: 'Paragraphs can be unused or used more than once.',
        studentAction: 'decide',
      },
    ],
    hintLadder: commonHints('Scan the whole passage — order is not guaranteed.'),
  },
  matching_features: {
    questionType: 'matching_features',
    label: 'Matching Features',
    decisionRule: 'Attribute each statement to the person the passage links it to — not the nearest name.',
    traps: ['distractor-option', 'paraphrase-miss'],
    steps: [
      {
        id: 'names',
        title: 'Map every name',
        instruction: 'Tap every occurrence of each feature/name in the passage.',
        studentAction: 'tap-keywords',
      },
      {
        id: 'locate',
        title: 'Find the linked claim',
        instruction: 'Check only sentences near the relevant name.',
        studentAction: 'tap-paragraph',
      },
      {
        id: 'decide',
        title: 'Attribute carefully',
        instruction: 'Names recur — do not assign by proximity alone.',
        studentAction: 'decide',
      },
    ],
    hintLadder: commonHints('Locate every mention of the candidate names first.'),
  },
  matching: {
    questionType: 'matching',
    label: 'Matching Sentence Endings',
    decisionRule: 'The ending must complete this stem’s idea and fit grammatically.',
    traps: ['partial-match', 'distractor-option'],
    steps: [
      {
        id: 'predict',
        title: 'Predict the ending',
        instruction: 'Before looking at options, predict meaning and grammar.',
        studentAction: 'watch',
      },
      {
        id: 'locate',
        title: 'Locate the stem idea',
        instruction: 'Tap the paragraph that covers the stem (usually in order).',
        studentAction: 'tap-paragraph',
      },
      {
        id: 'decide',
        title: 'Match & eliminate',
        instruction: 'Reject endings that are true elsewhere but unconnected to this stem.',
        studentAction: 'decide',
      },
    ],
    hintLadder: commonHints('Predict first, then scan for the stem idea in order.'),
  },
  mcq_single: {
    questionType: 'mcq_single',
    label: 'Multiple Choice (one answer)',
    decisionRule: 'The correct option paraphrases the evidence; every distractor fails for a nameable reason.',
    traps: ['distractor-option', 'opposite-meaning', 'absolute-language'],
    steps: [
      {
        id: 'stem',
        title: 'Read the stem only',
        instruction: 'Hide options. Form your own answer from keywords.',
        studentAction: 'watch',
      },
      {
        id: 'locate',
        title: 'Locate evidence',
        instruction: 'Tap the paragraph that answers the stem.',
        studentAction: 'tap-paragraph',
      },
      {
        id: 'own',
        title: 'Answer in your words',
        instruction: 'Say what the passage says before revealing options.',
        studentAction: 'watch',
      },
      {
        id: 'decide',
        title: 'Match & eliminate',
        instruction: 'Eliminate: mentioned-but-different / opposite / not stated / too extreme.',
        studentAction: 'decide',
      },
    ],
    hintLadder: commonHints('Answer from the passage first, then match an option.'),
  },
  mcq_multi: {
    questionType: 'mcq_multi',
    label: 'Multiple Choice (multi)',
    decisionRule: 'Select every option the passage supports; treat each option as a mini-TFNG.',
    traps: ['partial-match', 'distractor-option'],
    steps: [
      {
        id: 'stem',
        title: 'Read the stem',
        instruction: 'Note how many answers are required.',
        studentAction: 'watch',
      },
      {
        id: 'each',
        title: 'Test each option',
        instruction: 'Locate evidence for each option separately.',
        studentAction: 'tap-paragraph',
      },
      {
        id: 'decide',
        title: 'Select supported options',
        instruction: 'Near-true options fail on one detail — drop them.',
        studentAction: 'decide',
      },
    ],
    hintLadder: commonHints('Check each option against its own evidence span.'),
  },
  mcq_choose_n: {
    questionType: 'mcq_choose_n',
    label: 'Multiple Choice (choose N)',
    decisionRule: 'Select exactly N options the passage supports.',
    traps: ['partial-match', 'distractor-option'],
    steps: [
      {
        id: 'count',
        title: 'Confirm N',
        instruction: 'Know exactly how many answers you must choose.',
        studentAction: 'watch',
      },
      {
        id: 'each',
        title: 'Test each option',
        instruction: 'Treat each option as True / False / NG against the passage.',
        studentAction: 'tap-paragraph',
      },
      {
        id: 'decide',
        title: 'Pick exactly N',
        instruction: 'Use the counter — stop when you have N supported options.',
        studentAction: 'decide',
      },
    ],
    hintLadder: commonHints('Track how many more supported options you still need.'),
  },
  sentence_completion: {
    questionType: 'sentence_completion',
    label: 'Sentence Completion',
    decisionRule: 'Copy the answer verbatim from the passage, within the word limit.',
    traps: ['vocab-gap', 'keyword-trap'],
    steps: [
      {
        id: 'type',
        title: 'Predict word type',
        instruction: 'Noun, number, place, adjective…?',
        studentAction: 'choose-chip',
      },
      {
        id: 'limit',
        title: 'Check the word limit',
        instruction: 'NO MORE THAN X WORDS / A NUMBER — pin this before scanning.',
        studentAction: 'watch',
      },
      {
        id: 'locate',
        title: 'Locate in order',
        instruction: 'Tap the paragraph; extract the exact word(s).',
        studentAction: 'tap-paragraph',
      },
      {
        id: 'decide',
        title: 'Write & re-read',
        instruction: 'Check grammar of the completed sentence and the word limit.',
        studentAction: 'type-answer',
      },
    ],
    hintLadder: commonHints('Predict the word type, then scan in order for the exact words.'),
  },
  short_answer: {
    questionType: 'short_answer',
    label: 'Short Answer',
    decisionRule: 'Answer type must match the question word; extract verbatim within the limit.',
    traps: ['keyword-trap', 'vocab-gap'],
    steps: [
      {
        id: 'qword',
        title: 'Question word',
        instruction: 'Who / when / how many / where — what type of answer is required?',
        studentAction: 'choose-chip',
      },
      {
        id: 'locate',
        title: 'Locate',
        instruction: 'Tap the paragraph and extract the exact words.',
        studentAction: 'tap-paragraph',
      },
      {
        id: 'decide',
        title: 'Write within the limit',
        instruction: 'Check type, spelling, and word limit.',
        studentAction: 'type-answer',
      },
    ],
    hintLadder: commonHints('Let the question word dictate the answer type.'),
  },
  note_completion: {
    questionType: 'note_completion',
    label: 'Note Completion',
    decisionRule: 'Notes paraphrase ideas; the answer word is still taken from the passage.',
    traps: ['paraphrase-miss', 'vocab-gap'],
    steps: [
      {
        id: 'map',
        title: 'Map the note skeleton',
        instruction: 'Headings map to passage sections — preview the layout first.',
        studentAction: 'watch',
      },
      {
        id: 'type',
        title: 'Predict each gap',
        instruction: 'Predict answer type per gap before scanning.',
        studentAction: 'choose-chip',
      },
      {
        id: 'locate',
        title: 'Locate in section order',
        instruction: 'Tap the section, extract verbatim within the limit.',
        studentAction: 'tap-paragraph',
      },
      {
        id: 'decide',
        title: 'Fill the note',
        instruction: 'Watch paraphrase traps — nearby wrong words are common.',
        studentAction: 'type-answer',
      },
    ],
    hintLadder: commonHints('Use note headings to jump to the right passage section.'),
  },
  form_completion: {
    questionType: 'form_completion',
    label: 'Form Completion',
    decisionRule: 'Forms need exact personal/factual data — spelling is critical.',
    traps: ['vocab-gap', 'keyword-trap'],
    steps: [
      {
        id: 'map',
        title: 'Read the form labels',
        instruction: 'Each label tells you the field meaning (name, date, number…).',
        studentAction: 'watch',
      },
      {
        id: 'locate',
        title: 'Locate the fact',
        instruction: 'Tap the paragraph; copy spelling exactly.',
        studentAction: 'tap-paragraph',
      },
      {
        id: 'decide',
        title: 'Fill the form',
        instruction: 'Check word limit and spelling letter-by-letter.',
        studentAction: 'type-answer',
      },
    ],
    hintLadder: commonHints('Labels point to the exact fact — copy spelling carefully.'),
  },
  summary_completion: {
    questionType: 'summary_completion',
    label: 'Summary Completion',
    decisionRule: 'The summary paraphrases; the gap word itself is verbatim from the passage.',
    traps: ['paraphrase-miss', 'vocab-gap'],
    steps: [
      {
        id: 'whole',
        title: 'Read the whole summary',
        instruction: 'Identify which slice of the passage it covers.',
        studentAction: 'watch',
      },
      {
        id: 'locate',
        title: 'Stay in the coverage span',
        instruction: 'Tap the paragraph range the summary covers.',
        studentAction: 'tap-paragraph',
      },
      {
        id: 'decide',
        title: 'Fill each gap',
        instruction: 'Expect paraphrase in the summary; extract the exact answer word.',
        studentAction: 'type-answer',
      },
    ],
    hintLadder: commonHints('Find the summary’s coverage span before filling gaps.'),
  },
  summary_completion_list: {
    questionType: 'summary_completion_list',
    label: 'Summary Completion (word bank)',
    decisionRule: 'Bank options must fit meaning AND grammar; close distractors are intentional.',
    traps: ['distractor-option', 'partial-match'],
    steps: [
      {
        id: 'whole',
        title: 'Read the summary',
        instruction: 'Preview bank options for grammar fit.',
        studentAction: 'watch',
      },
      {
        id: 'locate',
        title: 'Locate evidence',
        instruction: 'Tap the coverage paragraph before choosing from the bank.',
        studentAction: 'tap-paragraph',
      },
      {
        id: 'decide',
        title: 'Pick from the bank',
        instruction: 'Reject options that are close in meaning but wrong in grammar or detail.',
        studentAction: 'decide',
      },
    ],
    hintLadder: commonHints('Check meaning and grammar against the bank options.'),
  },
  table_completion: {
    questionType: 'table_completion',
    label: 'Table Completion',
    decisionRule: 'A cell answer must satisfy both its row and column meaning.',
    traps: ['keyword-trap', 'partial-match'],
    steps: [
      {
        id: 'axes',
        title: 'Read headers',
        instruction: 'Which axis mirrors the passage structure (time, categories…)?',
        studentAction: 'watch',
      },
      {
        id: 'cell',
        title: 'Combine row + column',
        instruction: 'Form a scan target from both headers, then locate.',
        studentAction: 'tap-paragraph',
      },
      {
        id: 'decide',
        title: 'Fill the cell',
        instruction: 'Extract verbatim within the word limit.',
        studentAction: 'type-answer',
      },
    ],
    hintLadder: commonHints('Combine row and column meaning into one scan target.'),
  },
  flowchart_completion: {
    questionType: 'flowchart_completion',
    label: 'Flowchart Completion',
    decisionRule: 'Box order mirrors process order; answers sit between neighboring steps.',
    traps: ['keyword-trap', 'paraphrase-miss'],
    steps: [
      {
        id: 'process',
        title: 'Find the process section',
        instruction: 'Locate sequence markers: then, next, after, stage.',
        studentAction: 'tap-keywords',
      },
      {
        id: 'box',
        title: 'Place each box',
        instruction: 'Search between neighboring steps’ anchors.',
        studentAction: 'tap-paragraph',
      },
      {
        id: 'decide',
        title: 'Fill the box',
        instruction: 'Extract verbatim; keep process order.',
        studentAction: 'type-answer',
      },
    ],
    hintLadder: commonHints('Follow sequence markers through the process section.'),
  },
  map_labeling: {
    questionType: 'map_labeling',
    label: 'Map Labelling',
    decisionRule: 'Resolve every label relative to an already-known location — never guess from the picture alone.',
    traps: ['keyword-trap', 'opposite-meaning'],
    steps: [
      {
        id: 'orient',
        title: 'Orient',
        instruction: 'Find the starting reference point and direction language (north of, opposite…).',
        studentAction: 'tap-keywords',
      },
      {
        id: 'order',
        title: 'Respect dependencies',
        instruction: 'Place known anchors first (e.g. café before “opposite the café”).',
        studentAction: 'watch',
      },
      {
        id: 'decide',
        title: 'Label the map',
        instruction: 'Follow the spatial chain; watch for reversed directions.',
        studentAction: 'decide',
      },
    ],
    hintLadder: commonHints('Start from the reference point and follow direction terms.'),
  },
};

export function getStrategyTemplate(questionType: string): StrategyTemplate | null {
  return READING_STRATEGY_TEMPLATES[questionType] ?? null;
}

export function listStrategyTemplates(): StrategyTemplate[] {
  return Object.values(READING_STRATEGY_TEMPLATES);
}
