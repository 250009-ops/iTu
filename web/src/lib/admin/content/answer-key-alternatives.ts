/** Parse stored answer-key value into editable alternative strings. */
export function parseTextAlternatives(
  value: string | string[] | undefined,
): string[] {
  if (Array.isArray(value)) {
    return value.length > 0 ? [...value] : [""];
  }
  if (!value || typeof value !== "string") return [""];

  const trimmed = value.trim();
  if (!trimmed) return [""];

  if (trimmed.includes(" / ")) {
    const parts = trimmed.split(" / ").map((s) => s.trim()).filter(Boolean);
    return parts.length > 0 ? parts : [""];
  }
  if (trimmed.includes("|")) {
    const parts = trimmed.split("|").map((s) => s.trim()).filter(Boolean);
    return parts.length > 0 ? parts : [""];
  }

  return [trimmed];
}

/** Collapse edited alternatives back to answer-key storage shape. */
export function commitTextAlternatives(alts: string[]): string | string[] {
  const trimmed = alts.map((s) => s.trim());
  const nonEmpty = trimmed.filter(Boolean);
  if (nonEmpty.length === 0) return "";
  if (alts.length === 1 && nonEmpty.length === 1) return nonEmpty[0]!;
  return trimmed;
}

export function hasTextAnswer(value: string | string[] | undefined): boolean {
  if (value == null) return false;
  if (Array.isArray(value)) {
    return value.some((s) => String(s).trim().length > 0);
  }
  return String(value).trim().length > 0;
}
