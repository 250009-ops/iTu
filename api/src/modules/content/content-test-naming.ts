import { ContentTestType } from '@prisma/client';

/** Business code prefix per skill, e.g. REA → REA-MOCK-A001 */
export const TEST_TYPE_CODE_PREFIX: Record<ContentTestType, string> = {
  [ContentTestType.LISTENING]: 'LIS',
  [ContentTestType.READING]: 'REA',
  [ContentTestType.WRITING]: 'WRI',
  [ContentTestType.SPEAKING]: 'SPK',
};

/** Display title prefix per skill, e.g. Reading → Reading Mock-A001 */
export const TEST_TYPE_TITLE_PREFIX: Record<ContentTestType, string> = {
  [ContentTestType.LISTENING]: 'Listening',
  [ContentTestType.READING]: 'Reading',
  [ContentTestType.WRITING]: 'Writing',
  [ContentTestType.SPEAKING]: 'Speaking',
};

const NEW_CODE_RE = /^[A-Z]{3}-MOCK-A(\d{3,})$/;
const LEGACY_ACAD_CODE_RE = /^[A-Z]{3}-ACAD-(\d+)$/;
const LEGACY_BANK_CODE_RE = /^SPK-BANK-(\d+)$/i;
const TITLE_MOCK_SERIAL_RE = /Mock-A(\d+)/i;
const TITLE_ACAD_SERIAL_RE = /Academic Mock\s+(\d+)/i;

export function formatSerial(serial: number): string {
  return `A${String(serial).padStart(3, '0')}`;
}

export function formatTestCode(type: ContentTestType, serial: number): string {
  return `${TEST_TYPE_CODE_PREFIX[type]}-MOCK-${formatSerial(serial)}`;
}

export function formatTestTitle(type: ContentTestType, serial: number): string {
  return `${TEST_TYPE_TITLE_PREFIX[type]} Mock-${formatSerial(serial)}`;
}

export function parseSerialFromCode(code: string): number {
  const normalized = code.trim().toUpperCase();
  for (const pattern of [NEW_CODE_RE, LEGACY_ACAD_CODE_RE]) {
    const match = normalized.match(pattern);
    if (match) return Number.parseInt(match[1]!, 10);
  }
  const bankMatch = normalized.match(LEGACY_BANK_CODE_RE);
  if (bankMatch) return Number.parseInt(bankMatch[1]!, 10);
  return 0;
}

export function parseSerialFromTitle(title: string): number {
  const mockMatch = title.match(TITLE_MOCK_SERIAL_RE);
  if (mockMatch) return Number.parseInt(mockMatch[1]!, 10);
  const acadMatch = title.match(TITLE_ACAD_SERIAL_RE);
  if (acadMatch) return Number.parseInt(acadMatch[1]!, 10);
  return 0;
}

export function maxSerialFromTests(
  tests: ReadonlyArray<{ code: string; title: string }>,
): number {
  return tests.reduce(
    (max, test) =>
      Math.max(
        max,
        parseSerialFromCode(test.code),
        parseSerialFromTitle(test.title),
      ),
    0,
  );
}

export function nextTestIdentity(
  type: ContentTestType,
  tests: ReadonlyArray<{ code: string; title: string }>,
): { code: string; title: string; serial: number } {
  const serial = maxSerialFromTests(tests) + 1;
  return {
    serial,
    code: formatTestCode(type, serial),
    title: formatTestTitle(type, serial),
  };
}

export function isValidTestCode(code: string): boolean {
  return NEW_CODE_RE.test(code.trim().toUpperCase());
}

export function assertValidTestCode(code: string): void {
  if (!isValidTestCode(code)) {
    throw new Error(
      'Test code must match format e.g. REA-MOCK-A001 (SKILL-MOCK-A###).',
    );
  }
}

/** Keep embedded content.testId aligned with the business code when present. */
export function syncContentTestId(content: unknown, code: string): unknown {
  if (!content || typeof content !== 'object' || Array.isArray(content)) {
    return content;
  }
  const record = content as Record<string, unknown>;
  if (!('testId' in record)) return content;
  return { ...record, testId: code };
}
