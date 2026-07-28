/** Client-side IELTS Academic raw → band lookup (mirrors api band resolution). */

export type BandBreakpoint = { raw: number; band: number };

export type BandTableLookupRow = {
  skill: "LISTENING" | "READING" | string;
  rawScore: number;
  band: number;
};

const LISTENING_BREAKPOINTS: BandBreakpoint[] = [
  { raw: 39, band: 9.0 },
  { raw: 37, band: 8.5 },
  { raw: 35, band: 8.0 },
  { raw: 32, band: 7.5 },
  { raw: 30, band: 7.0 },
  { raw: 26, band: 6.5 },
  { raw: 23, band: 6.0 },
  { raw: 18, band: 5.5 },
  { raw: 16, band: 5.0 },
  { raw: 13, band: 4.5 },
  { raw: 11, band: 4.0 },
  { raw: 8, band: 3.5 },
  { raw: 6, band: 3.0 },
  { raw: 4, band: 2.5 },
  { raw: 0, band: 2.5 },
];

const READING_BREAKPOINTS: BandBreakpoint[] = [
  { raw: 39, band: 9.0 },
  { raw: 37, band: 8.5 },
  { raw: 35, band: 8.0 },
  { raw: 33, band: 7.5 },
  { raw: 30, band: 7.0 },
  { raw: 27, band: 6.5 },
  { raw: 23, band: 6.0 },
  { raw: 19, band: 5.5 },
  { raw: 15, band: 5.0 },
  { raw: 13, band: 4.5 },
  { raw: 10, band: 4.0 },
  { raw: 8, band: 3.5 },
  { raw: 6, band: 3.0 },
  { raw: 5, band: 2.5 },
  { raw: 4, band: 2.0 },
  { raw: 3, band: 1.0 },
  { raw: 0, band: 0 },
];

function lookupFromBreakpoints(
  rawScore: number,
  breakpoints: BandBreakpoint[],
): number | null {
  const clamped = Math.max(0, Math.min(40, Math.round(rawScore)));
  const sorted = [...breakpoints].sort((a, b) => b.raw - a.raw);
  const match = sorted.find((bp) => clamped >= bp.raw);
  return match?.band ?? null;
}

/** Prefer live band table rows (exact, then nearest ≤ raw); fall back to static table. */
export function lookupBandFromTable(
  skill: "listening" | "reading",
  rawScore: number,
  table: BandTableLookupRow[] | null | undefined,
): number | null {
  if (!Number.isFinite(rawScore)) return null;
  const clamped = Math.max(0, Math.min(40, Math.round(rawScore)));
  const skillKey = skill.toUpperCase();
  const rows = (table ?? [])
    .filter((r) => String(r.skill).toUpperCase() === skillKey)
    .sort((a, b) => b.rawScore - a.rawScore);

  if (rows.length > 0) {
    const exact = rows.find((r) => r.rawScore === clamped);
    if (exact) return exact.band;
    const nearest = rows.find((r) => r.rawScore <= clamped);
    if (nearest) return nearest.band;
  }

  return lookupBandFromRaw(skill, clamped);
}

export function lookupBandFromRaw(
  skill: "listening" | "reading",
  rawScore: number,
): number | null {
  if (!Number.isFinite(rawScore)) return null;
  return skill === "listening"
    ? lookupFromBreakpoints(rawScore, LISTENING_BREAKPOINTS)
    : lookupFromBreakpoints(rawScore, READING_BREAKPOINTS);
}

export function parseScoreInput(value: string): number | null {
  const normalized = value.trim().replace(",", ".");
  if (!normalized) return null;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}
