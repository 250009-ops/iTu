export type ExamSkill = "listening" | "reading" | "writing" | "speaking";

export type AnswerValue = string | string[] | null;

export type AnswerMap = Record<number, AnswerValue>;

/** A blank embedded in a sentence/note/table — its `n` ties it to a question number. */
export interface Gap {
  n: number;
  /** Optional prefix word limit hint shown as placeholder, e.g. "ONE WORD". */
  placeholder?: string;
}

/** Rich inline text with optional bold (plain strings remain valid for legacy content). */
export interface TextSpan {
  type: "text";
  value: string;
  bold?: boolean;
}

/** Inline content can be plain text, formatted text, or a numbered gap. */
export type InlineNode = string | Gap | TextSpan;

export type CompletionLineStyle = "normal" | "heading" | "subheading" | "bullet";

/** One row in a note/form/summary block — optional IELTS-style label or bullet. */
export interface CompletionLine {
  style?: CompletionLineStyle;
  nodes: InlineNode[];
}

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
  /** Structured lines — legacy `InlineNode[][]` is normalized on load. */
  lines: CompletionLine[];
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
  questions: { n: number; prompt: string; /** Passage section letter for matching_headings */ section?: string }[];
}

/** Reading: which passage section (A–F) contains each statement — Cambridge dropdown UI. */
export interface MatchingInformationGroup extends BaseGroup {
  type: "matching_information";
  questions: { n: number; prompt: string }[];
  /** Dropdown values; defaults to passage paragraph markers when omitted. */
  sectionLabels?: string[];
}

export interface TfngGroup extends BaseGroup {
  type: "tfng" | "yng";
  questions: { n: number; prompt: string }[];
}

export interface MapLabelingGroup extends BaseGroup {
  type: "map_labeling";
  imageLabel: string;
  /** Optional uploaded map image URL (from admin media library). */
  imageUrl?: string;
  options: MatchOption[];
  /** Drop zones positioned as percentages over the image. */
  zones: { n: number; x: number; y: number; label: string }[];
}

export interface ShortAnswerGroup extends BaseGroup {
  type: "short_answer";
  questions: { n: number; prompt: string }[];
}

/** Listening: vertical flow with drag-in option labels at gap nodes. */
export type FlowchartNode =
  | { kind: "text"; text: string }
  | { kind: "gap"; n: number };

export interface FlowchartCompletionGroup extends BaseGroup {
  type: "flowchart_completion";
  title?: string;
  options: MatchOption[];
  nodes: FlowchartNode[];
}

/** L/R/W interstitial — no question numbers or answers. */
export interface InstructionScreenGroup extends BaseGroup {
  type: "instruction_screen";
  body: string;
  buttonLabel?: string;
}

/** Reading: match statements to people/features via dropdown. */
export interface MatchingFeaturesGroup extends BaseGroup {
  type: "matching_features";
  /** Heading above the feature/person list, e.g. "List of researchers". */
  listTitle?: string;
  options: MatchOption[];
  questions: { n: number; prompt: string }[];
}

export type QuestionGroup =
  | NoteCompletionGroup
  | TableCompletionGroup
  | McqSingleGroup
  | McqMultiGroup
  | MatchingGroup
  | MatchingInformationGroup
  | MatchingFeaturesGroup
  | TfngGroup
  | MapLabelingGroup
  | ShortAnswerGroup
  | FlowchartCompletionGroup
  | InstructionScreenGroup;

/** ---- Section structure ---- */

export interface ListeningAudioTrack {
  part: number;
  url: string;
  title?: string;
}

export interface ListeningPart {
  id: string;
  part: number;
  title: string;
  blurb: string;
  /** Optional per-part audio URL (merged from media assets when served by API). */
  audioUrl?: string;
  groups: QuestionGroup[];
}

export interface ReadingPassage {
  id: string;
  part: number;
  title: string;
  /** Optional tagline shown in italics below the title (IELTS reading style). */
  subtitle?: string;
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
  /** Optional full-screen intro before the task (writing instruction interstitial). */
  introScreen?: { body: string; buttonLabel?: string };
  prompt: string;
  /** Optional visual asset rendered in the prompt pane (chart/diagram). */
  visual?: {
    kind: "bar" | "line" | "pie" | "table" | "process" | "map";
    caption: string;
    /** Uploaded chart/diagram image URL (admin media library). */
    imageUrl?: string;
    alt?: string;
  };
}

export interface ListeningContent {
  testId: string;
  title: string;
  totalQuestions: number;
  durationMinutes: number;
  parts: ListeningPart[];
  /** Ordered audio tracks — plays once, no rewind (IELTS listening rules). */
  audioTracks?: ListeningAudioTrack[];
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
  /** Part 1 interviewer questions (examiner-only; not shown to student). */
  part1Questions?: string[];
  /** Part 3 discussion questions (examiner-only). */
  part3Questions?: string[];
  /** Optional examiner notes during Part 2 (prep/speak/rounding-off). */
  part2ExaminerNotes?: string[];
}

export function isGap(node: InlineNode): node is Gap {
  return typeof node === "object" && node !== null && "n" in node && !("type" in node);
}
