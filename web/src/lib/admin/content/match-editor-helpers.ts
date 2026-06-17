import type { AnswerKeyMap } from "@/lib/admin/content/utils";
import type { MatchOption } from "@/lib/exam/types";

/** Next unused letter id for a match options bank (A, B, C…). */
export function nextMatchOptionId(options: { id: string }[]): string {
  const used = new Set(options.map((o) => o.id.toUpperCase()));
  for (let i = 0; i < 26; i++) {
    const id = String.fromCharCode(65 + i);
    if (!used.has(id)) return id;
  }
  return `Z${options.length + 1}`;
}

export function defaultMatchOptions(count: number): MatchOption[] {
  return Array.from({ length: count }, (_, i) => {
    const id = String.fromCharCode(65 + i);
    return { id, label: `Option ${id}` };
  });
}

export function removeAnswerKeyEntry(
  answerKey: AnswerKeyMap,
  questionN: number,
): AnswerKeyMap {
  const next = { ...answerKey };
  delete next[String(questionN)];
  return next;
}

export function removeQuestionAt<T extends { n: number }>(
  questions: T[],
  idx: number,
  minCount = 1,
): T[] | null {
  if (questions.length <= minCount) return null;
  return questions.filter((_, i) => i !== idx);
}
