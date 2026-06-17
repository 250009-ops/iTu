import { Prisma } from '@prisma/client';

export function normalizeAnswer(v: string): string {
  return v.trim().toLowerCase();
}

/** Split legacy single-string keys that encode OR alternatives. */
export function expandExpectedAlternatives(
  expected: string | string[],
): string[] {
  if (Array.isArray(expected)) {
    return expected.map((s) => String(s)).filter((s) => s.trim().length > 0);
  }

  const raw = String(expected ?? '').trim();
  if (!raw) return [];

  if (raw.includes(' / ')) {
    return raw
      .split(' / ')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (raw.includes('|')) {
    return raw
      .split('|')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  return [raw];
}

export function matchAnswer(
  submitted: Prisma.JsonValue,
  expected: string | string[],
): boolean {
  const submittedIsArray = Array.isArray(submitted);
  const expectedIsArray = Array.isArray(expected);

  if (expectedIsArray && submittedIsArray) {
    const sortedExpected = [...expected].map(normalizeAnswer).sort();
    const sortedSubmitted = submitted
      .map((s) => normalizeAnswer(String(s)))
      .sort();
    return JSON.stringify(sortedExpected) === JSON.stringify(sortedSubmitted);
  }

  if (expectedIsArray && !submittedIsArray) {
    const submittedStr = String(submitted ?? '');
    const normalizedSubmitted = normalizeAnswer(submittedStr);
    return expected.some(
      (alt) => normalizeAnswer(String(alt)) === normalizedSubmitted,
    );
  }

  const alternatives = expandExpectedAlternatives(expected);
  if (alternatives.length === 0) return false;

  const submittedStr = submittedIsArray
    ? submitted.map((s) => String(s)).join(' ')
    : String(submitted ?? '');
  const normalizedSubmitted = normalizeAnswer(submittedStr);

  return alternatives.some(
    (alt) => normalizeAnswer(alt) === normalizedSubmitted,
  );
}
