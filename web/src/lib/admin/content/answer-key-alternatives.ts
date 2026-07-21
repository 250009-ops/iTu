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
  if (alts.length === 0) return "";
  if (alts.length === 1) return alts[0] ?? "";
  return alts;
}

/** Trim alternatives for persistence — keeps internal spaces, drops empty slots. */
export function normalizeTextAlternativesForSave(
  value: string | string[] | undefined,
): string | string[] {
  if (Array.isArray(value)) {
    const trimmed = value.map((s) => s.trim()).filter(Boolean);
    if (trimmed.length === 0) return "";
    if (trimmed.length === 1) return trimmed[0]!;
    return trimmed;
  }
  if (typeof value !== "string") return "";
  return value.trim();
}

export function hasTextAnswer(value: string | string[] | undefined): boolean {
  if (value == null) return false;
  if (Array.isArray(value)) {
    return value.some((s) => String(s).trim().length > 0);
  }
  return String(value).trim().length > 0;
}
