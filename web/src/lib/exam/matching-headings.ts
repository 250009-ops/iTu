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

export function sectionLetterRange(sectionLetters: string[]): string {
  if (sectionLetters.length === 0) return "";
  if (sectionLetters.length === 1) return sectionLetters[0]!;
  return `${sectionLetters[0]}–${sectionLetters[sectionLetters.length - 1]}`;
}

/** Default Cambridge-style matching headings instruction from section letters. */
export function defaultMatchingHeadingsInstruction(sectionLetters: string[]): string {
  const count = sectionLetters.length;
  if (count === 0) {
    return "Choose the correct heading for each section.";
  }
  const range = sectionLetterRange(sectionLetters);
  return `The text has ${sectionCountWord(count)} sections, ${range}. Choose the correct heading for each section.`;
}

/** True when instruction looks auto-generated and can be updated safely. */
export function isAutoMatchingHeadingsInstruction(instruction: string | undefined): boolean {
  if (!instruction?.trim()) return true;
  return /^The text has \w+ sections,/i.test(instruction.trim());
}

export function normalizeMatchingHeadingsGroup(group: MatchingGroup): MatchingGroup {
  if (group.type !== "matching_headings") return group;

  const rawQuestions = group.questions ?? [];
  const legacyExample = rawQuestions.find(
    (q) => (q as { isExample?: boolean }).isExample,
  ) as (MatchingQuestion & { isExample?: boolean; exampleHeadingId?: string }) | undefined;

  let example = group.example;
  if (legacyExample && !example) {
    const section = resolveMatchingSection(legacyExample).toUpperCase();
    const headingId = legacyExample.exampleHeadingId?.trim() ?? "";
    if (section && headingId) {
      example = { section, headingId };
    }
  } else if (example?.section) {
    example = {
      section: example.section.trim().toUpperCase(),
      headingId: example.headingId?.trim() ?? "",
    };
    if (!example.headingId) example = undefined;
  }

  const exampleSection = example?.section?.toUpperCase();
  const questions = rawQuestions
    .filter((q) => !(q as { isExample?: boolean }).isExample)
    .map(({ n, prompt, section }) => ({ n, prompt, section }))
    .filter((q) => {
      if (!exampleSection) return true;
      return resolveMatchingSection(q).toUpperCase() !== exampleSection;
    });

  return { ...group, example, questions };
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
  const exampleSection = group.example?.section?.trim().toUpperCase();
  group.questions.forEach((q, idx) => {
    const section = resolveMatchingSection(q, paragraphMarkers[idx]).toUpperCase();
    if (!section || section === exampleSection) return;
    map.set(section, q);
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
  group: Pick<MatchingGroup, "example" | "questions">,
  answers: Record<number, string>,
): Set<string> {
  const used = new Set<string>();
  if (group.example?.headingId) used.add(group.example.headingId);
  for (const q of group.questions) {
    const v = answers[q.n];
    if (typeof v === "string" && v) used.add(v);
  }
  return used;
}
