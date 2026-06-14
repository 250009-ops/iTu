export type ExamSkill = "listening" | "reading" | "writing" | "speaking";

export type AnswerValue = string | string[] | null;

export type AnswerMap = Record<number, AnswerValue>;

/** A blank embedded in a sentence/note/table — its `n` ties it to a question number. */
export interface Gap {
  n: number;
  /** Optional prefix word limit hint shown as placeholder, e.g. "ONE WORD". */
  placeholder?: string;
}

/** Inline content can be plain text or a numbered gap. */
export type InlineNode = string | Gap;

export interface Option {
  id: string;
  label: string;
}

export interface MatchOption {
  id: string;
  label: string;
}

/** ---- Question group variants (discriminated by `type`) ---- */

interface BaseGroup {
  id: string;
  /** Inclusive question-number range this group covers. */
  from: number;
  to: number;
  instruction: string;
  /** Optional smaller hint, e.g. "Write ONE WORD AND/OR A NUMBER". */
  hint?: string;
}

export interface NoteCompletionGroup extends BaseGroup {
  type: "note_completion" | "form_completion" | "summary_completion" | "sentence_completion";
  /** Optional title shown above the note block. */
  title?: string;
  /** Each line is a sequence of text + gaps. */
  lines: InlineNode[][];
}

export interface TableCompletionGroup extends BaseGroup {
  type: "table_completion";
  title?: string;
  columns: string[];
  rows: InlineNode[][][];
}

export interface McqSingleGroup extends BaseGroup {
  type: "mcq_single";
  questions: { n: number; prompt: string; options: Option[] }[];
}

export interface McqMultiGroup extends BaseGroup {
  type: "mcq_multi";
  prompt: string;
  /** The question numbers grouped, e.g. [18, 19]. */
  numbers: number[];
  maxSelections: number;
  options: Option[];
}

export interface MatchingGroup extends BaseGroup {
  type: "matching" | "matching_headings";
  options: MatchOption[];
  questions: { n: number; prompt: string }[];
}

export interface TfngGroup extends BaseGroup {
  type: "tfng" | "yng";
  questions: { n: number; prompt: string }[];
}

export interface MapLabelingGroup extends BaseGroup {
  type: "map_labeling";
  imageLabel: string;
  options: MatchOption[];
  /** Drop zones positioned as percentages over the image. */
  zones: { n: number; x: number; y: number; label: string }[];
}

export interface ShortAnswerGroup extends BaseGroup {
  type: "short_answer";
  questions: { n: number; prompt: string }[];
}

export type QuestionGroup =
  | NoteCompletionGroup
  | TableCompletionGroup
  | McqSingleGroup
  | McqMultiGroup
  | MatchingGroup
  | TfngGroup
  | MapLabelingGroup
  | ShortAnswerGroup;

/** ---- Section structure ---- */

export interface ListeningPart {
  id: string;
  part: number;
  title: string;
  blurb: string;
  groups: QuestionGroup[];
}

export interface ReadingPassage {
  id: string;
  part: number;
  title: string;
  blurb: string;
  /** Passage paragraphs; each paragraph may carry a section marker (A, B, …). */
  paragraphs: { marker?: string; text: string }[];
  groups: QuestionGroup[];
}

export interface WritingTask {
  id: string;
  part: number;
  taskNumber: 1 | 2;
  minutes: number;
  minWords: number;
  instruction: string;
  prompt: string;
  /** Optional visual asset rendered in the prompt pane (chart/diagram placeholder). */
  visual?: { kind: "bar" | "line" | "pie" | "table" | "process" | "map"; caption: string };
}

export interface ListeningContent {
  testId: string;
  title: string;
  totalQuestions: number;
  durationMinutes: number;
  parts: ListeningPart[];
}

export interface ReadingContent {
  testId: string;
  title: string;
  totalQuestions: number;
  durationMinutes: number;
  passages: ReadingPassage[];
}

export interface WritingContent {
  testId: string;
  title: string;
  durationMinutes: number;
  tasks: WritingTask[];
}

export interface SpeakingPart {
  part: number;
  title: string;
  guidance: string;
  durationSec: number;
}

export interface SpeakingCueCard {
  title: string;
  bullets: string[];
  prepSeconds: number;
  speakSeconds: number;
}

export interface SpeakingContent {
  testId: string;
  examiner: string;
  examinerTitle: string;
  slot: string;
  parts: SpeakingPart[];
  cueCard: SpeakingCueCard;
}

export function isGap(node: InlineNode): node is Gap {
  return typeof node === "object" && node !== null && "n" in node;
}
