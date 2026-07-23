import type { McqChooseNGroup } from "@/lib/exam/types";

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

export function mcqChooseNNumbers(group: McqChooseNGroup): number[] {
  return Array.from({ length: group.chooseCount }, (_, i) => group.from + i);
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
  const to = group.from + chooseCount - 1;
  return {
    ...group,
    chooseCount,
    to,
    instruction: buildMcqChooseNInstruction(chooseCount, group.options),
  };
}
