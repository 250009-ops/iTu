import type { MatchOption, MatchingGroup, QuestionGroup } from "@/lib/exam/types";

export type MatchingQuestion = MatchingGroup["questions"][number];

const SECTION_COUNT_WORDS = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
  "twenty",
] as const;

export function sectionCountWord(count: number): string {
  return SECTION_COUNT_WORDS[count] ?? String(count);
}

/** Default Cambridge-style matching headings instruction from section letters. */
export function defaultMatchingHeadingsInstruction(sectionLetters: string[]): string {
  const count = sectionLetters.length;
  if (count === 0) {
    return "Choose the correct heading for each section.";
  }
  const range =
    count === 1
      ? sectionLetters[0]!
      : `${sectionLetters[0]}–${sectionLetters[sectionLetters.length - 1]}`;
  return `The text has ${sectionCountWord(count)} sections, ${range}. Choose the correct heading for each section.`;
}

/** True when instruction looks auto-generated and can be updated safely. */
export function isAutoMatchingHeadingsInstruction(instruction: string | undefined): boolean {
  if (!instruction?.trim()) return true;
  return /^The text has \w+ sections,/i.test(instruction.trim());
}

export function matchingHeadingsSectionLetters(
  questions: MatchingQuestion[],
  paragraphMarkers: string[],
): string[] {
  return questions
    .filter((q) => !q.isExample)
    .map((q, idx) => resolveMatchingSection(q, paragraphMarkers[idx]))
    .filter(Boolean);
}

export function resolveMatchingSection(
  question: MatchingQuestion,
  fallback?: string,
): string {
  if (question.section?.trim()) return question.section.trim();
  const fromPrompt = question.prompt.match(/section\s+([A-Z])/i)?.[1];
  if (fromPrompt) return fromPrompt.toUpperCase();
  return fallback ?? "";
}

export function matchingHeadingsForPassage(groups: QuestionGroup[]): MatchingGroup[] {
  return groups.filter((g): g is MatchingGroup => g.type === "matching_headings");
}

export function sectionQuestionMap(
  group: MatchingGroup,
  paragraphMarkers: string[],
): Map<string, MatchingQuestion> {
  const map = new Map<string, MatchingQuestion>();
  group.questions.forEach((q, idx) => {
    const section = resolveMatchingSection(q, paragraphMarkers[idx]);
    if (section) map.set(section, q);
  });
  return map;
}

export function headingLabel(
  options: MatchOption[],
  optionId: string | undefined,
): string | undefined {
  if (!optionId) return undefined;
  return options.find((o) => o.id === optionId)?.label;
}

export function usedHeadingIds(
  questions: { n: number; isExample?: boolean; exampleHeadingId?: string }[],
  answers: Record<number, string>,
): Set<string> {
  const used = new Set<string>();
  for (const q of questions) {
    if (q.isExample && q.exampleHeadingId) {
      used.add(q.exampleHeadingId);
      continue;
    }
    const v = answers[q.n];
    if (typeof v === "string" && v) used.add(v);
  }
  return used;
}
