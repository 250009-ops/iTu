import { ExamSkill } from '@prisma/client';

/** IELTS Academic threshold rows — band applies for raw scores >= threshold up to next. */
const LISTENING_ACADEMIC_BREAKPOINTS: { raw: number; band: number }[] = [
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

const READING_ACADEMIC_BREAKPOINTS: { raw: number; band: number }[] = [
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

function expandBreakpoints(
  breakpoints: { raw: number; band: number }[],
): { rawScore: number; band: number }[] {
  const sorted = [...breakpoints].sort((a, b) => b.raw - a.raw);
  const rows: { rawScore: number; band: number }[] = [];
  for (let raw = 40; raw >= 0; raw--) {
    const match = sorted.find((bp) => raw >= bp.raw) ?? sorted[sorted.length - 1]!;
    rows.push({ rawScore: raw, band: match.band });
  }
  return rows;
}

export const IELTS_ACADEMIC_LISTENING_ROWS = expandBreakpoints(
  LISTENING_ACADEMIC_BREAKPOINTS,
);

export const IELTS_ACADEMIC_READING_ROWS = expandBreakpoints(
  READING_ACADEMIC_BREAKPOINTS,
);

export function defaultBandRowsForSkill(
  skill: ExamSkill,
): { rawScore: number; band: number }[] {
  if (skill === ExamSkill.LISTENING) return IELTS_ACADEMIC_LISTENING_ROWS;
  if (skill === ExamSkill.READING) return IELTS_ACADEMIC_READING_ROWS;
  return [];
}

/** In-memory lookup — matches DB band_conversion_tables semantics. */
export function bandFromRawScoreTable(
  skill: ExamSkill,
  rawScore: number,
  rows?: { rawScore: number; band: number }[],
): number | null {
  const table = rows ?? defaultBandRowsForSkill(skill);
  if (!table.length) return null;
  const clamped = Math.max(0, Math.min(40, Math.round(rawScore)));
  const exact = table.find((r) => r.rawScore === clamped);
  return exact?.band ?? null;
}
