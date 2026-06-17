import type { MatchOption, MatchingGroup, QuestionGroup } from "@/lib/exam/types";

export type MatchingQuestion = MatchingGroup["questions"][number];

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
  questions: { n: number }[],
  answers: Record<number, string>,
): Set<string> {
  const used = new Set<string>();
  for (const q of questions) {
    const v = answers[q.n];
    if (typeof v === "string" && v) used.add(v);
  }
  return used;
}
