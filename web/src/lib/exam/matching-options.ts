import type { MatchOption } from "@/lib/exam/types";

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Removes a duplicate option-letter prefix from stored labels (e.g. "A. Limited space"). */
export function stripMatchOptionPrefix(optionId: string, label: string): string {
  const trimmed = label.trim();
  if (!trimmed || !optionId.trim()) return trimmed;

  const id = escapeRegex(optionId.trim());
  const withPunctuation = new RegExp(`^${id}[.)][:–-]?\\s+`, "i");
  if (withPunctuation.test(trimmed)) {
    return trimmed.replace(withPunctuation, "").trim();
  }

  const withSpace = new RegExp(`^${id}\\s+`, "i");
  if (withSpace.test(trimmed)) {
    return trimmed.replace(withSpace, "").trim();
  }

  return trimmed;
}

export function matchOptionDisplayLabel(option: MatchOption): string {
  return stripMatchOptionPrefix(option.id, option.label);
}

export const MATCHING_NB_SUFFIX = "NB You may use any letter more than once.";

export function stripMatchingNbSuffix(hint: string | undefined): string {
  if (!hint?.trim()) return "";
  return hint
    .replace(/\s*NB\s+You may use any letter more than once\.?\s*/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function hasMatchingNbSuffix(hint: string | undefined): boolean {
  return /NB\s+You may use any letter more than once/i.test(hint ?? "");
}

export function optionLetterRange(options: MatchOption[]): string {
  if (options.length === 0) return "A–G";
  const first = options[0]!.id;
  const last = options[options.length - 1]!.id;
  return first === last ? first : `${first}–${last}`;
}

export function matchingHintWithReuse(baseHint: string, reuseOptions: boolean): string {
  const base = stripMatchingNbSuffix(baseHint);
  if (!reuseOptions) return base;
  if (!base) return MATCHING_NB_SUFFIX;
  const sep = base.endsWith(".") || base.endsWith("?") ? " " : ". ";
  return `${base}${sep}${MATCHING_NB_SUFFIX}`;
}

export function inferMatchingReuseOptions(group: {
  reuseOptions?: boolean;
  hint?: string;
}): boolean {
  if (group.reuseOptions === true) return true;
  if (group.reuseOptions === false) return false;
  return hasMatchingNbSuffix(group.hint);
}

export function defaultMatchingFeaturesHint(
  options: MatchOption[],
  reuseOptions: boolean,
): string {
  const range = optionLetterRange(options);
  return matchingHintWithReuse(
    `Match each statement with the correct person, ${range}.`,
    reuseOptions,
  );
}

export function defaultListeningMatchingHint(reuseOptions: boolean): string {
  return matchingHintWithReuse(
    "Drag the correct letter next to each question.",
    reuseOptions,
  );
}

export function usedMatchOptionIds(
  questions: { n: number }[],
  answers: Record<number, string>,
  excludeQuestion?: number,
): Set<string> {
  const used = new Set<string>();
  for (const q of questions) {
    if (q.n === excludeQuestion) continue;
    const v = answers[q.n]?.trim();
    if (v) used.add(v);
  }
  return used;
}
