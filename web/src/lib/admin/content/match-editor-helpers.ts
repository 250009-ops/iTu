import type { AnswerKeyMap } from "@/lib/admin/content/utils";
import type { MatchOption } from "@/lib/exam/types";

const ROMAN_NUMERALS = [
  "i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x",
  "xi", "xii", "xiii", "xiv", "xv", "xvi", "xvii", "xviii", "xix", "xx",
];

/** Next unused lowercase Roman numeral id for a headings bank (i, ii, iii…). */
export function nextRomanNumeralId(options: { id: string }[]): string {
  const used = new Set(options.map((o) => o.id.toLowerCase()));
  for (const id of ROMAN_NUMERALS) {
    if (!used.has(id)) return id;
  }
  return `xx${options.length + 1}`;
}

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
