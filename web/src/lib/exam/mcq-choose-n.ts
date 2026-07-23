import type { McqChooseNGroup, McqMultiGroup } from "@/lib/exam/types";

const COUNT_WORDS: Record<number, string> = {
  2: "TWO",
  3: "THREE",
  4: "FOUR",
  5: "FIVE",
  6: "SIX",
  7: "SEVEN",
};

export function chooseCountWord(count: number): string {
  return COUNT_WORDS[count] ?? String(count);
}

export function chooseLettersRange(options: { id: string }[]): string {
  if (options.length === 0) return "A–F";
  const first = options[0]!.id;
  const last = options[options.length - 1]!.id;
  return first === last ? first : `${first}–${last}`;
}

/** One answer-sheet number for choose-N-together groups. */
export function mcqChooseNQuestionNumber(group: McqChooseNGroup): number {
  return group.from;
}

export function mcqChooseNNumbers(group: McqChooseNGroup): number[] {
  return [mcqChooseNQuestionNumber(group)];
}

export function isMcqMultiPerQuestion(group: McqMultiGroup): boolean {
  return group.selectionMode === "per_question";
}

export function mcqSharedQuestionNumber(group: McqMultiGroup): number {
  if (isMcqMultiPerQuestion(group)) {
    return group.numbers[0] ?? group.from;
  }
  return group.from;
}

export function mcqMultiGapNumbers(group: McqMultiGroup): number[] {
  if (isMcqMultiPerQuestion(group)) {
    return group.numbers;
  }
  return [mcqSharedQuestionNumber(group)];
}

export function buildMcqChooseNInstruction(
  chooseCount: number,
  options: { id: string }[],
): string {
  return `Choose ${chooseCountWord(chooseCount)} letters ${chooseLettersRange(options)}.`;
}

/** Keep from/to/instruction aligned when chooseCount or options change. */
export function syncMcqChooseNMeta(group: McqChooseNGroup): McqChooseNGroup {
  const chooseCount = Math.max(
    2,
    Math.min(group.options.length, group.chooseCount || 2),
  );
  return {
    ...group,
    chooseCount,
    to: group.from,
    instruction: buildMcqChooseNInstruction(chooseCount, group.options),
  };
}

/** Collapse legacy shared groups that spanned N numbers into one question. */
export function normalizeMcqMultiSharedGroup(group: McqMultiGroup): McqMultiGroup {
  if (isMcqMultiPerQuestion(group)) {
    return group;
  }
  const from =
    typeof group.from === "number"
      ? group.from
      : (group.numbers[0] ?? 1);
  const maxSelections =
    typeof group.maxSelections === "number" && group.maxSelections >= 2
      ? group.maxSelections
      : Math.max(2, group.numbers.length);
  return {
    ...group,
    selectionMode: "shared",
    from,
    to: from,
    numbers: [from],
    maxSelections,
  };
}
