import { ContentTestType } from '@prisma/client';
import {
  formatTestCode,
  formatTestTitle,
  isValidTestCode,
  maxSerialFromTests,
  nextTestIdentity,
  parseSerialFromCode,
  parseSerialFromTitle,
  syncContentTestId,
} from './content-test-naming';

describe('content-test-naming', () => {
  it('formats canonical code and title', () => {
    expect(formatTestCode(ContentTestType.READING, 1)).toBe('REA-MOCK-A001');
    expect(formatTestTitle(ContentTestType.READING, 1)).toBe('Reading Mock-A001');
    expect(formatTestCode(ContentTestType.SPEAKING, 12)).toBe('SPK-MOCK-A012');
  });

  it('parses serials from new and legacy codes', () => {
    expect(parseSerialFromCode('REA-MOCK-A007')).toBe(7);
    expect(parseSerialFromCode('LIS-ACAD-005')).toBe(5);
    expect(parseSerialFromCode('SPK-BANK-003')).toBe(3);
    expect(parseSerialFromCode('REA-ACAD-K3F9')).toBe(0);
  });

  it('parses serials from new and legacy titles', () => {
    expect(parseSerialFromTitle('Reading Mock-A004')).toBe(4);
    expect(parseSerialFromTitle('Reading — Academic Mock 005')).toBe(5);
    expect(parseSerialFromTitle('Reading — Academic Mock Copy Copy')).toBe(0);
  });

  it('allocates the next serial from existing tests', () => {
    const identity = nextTestIdentity(ContentTestType.READING, [
      { code: 'REA-MOCK-A001', title: 'Reading Mock-A001' },
      { code: 'REA-ACAD-005', title: 'Reading — Academic Mock 005' },
    ]);
    expect(identity.serial).toBe(6);
    expect(identity.code).toBe('REA-MOCK-A006');
    expect(identity.title).toBe('Reading Mock-A006');
  });

  it('validates canonical code format', () => {
    expect(isValidTestCode('REA-MOCK-A001')).toBe(true);
    expect(isValidTestCode('rea-mock-a001')).toBe(true);
    expect(isValidTestCode('REA-ACAD-005')).toBe(false);
    expect(isValidTestCode('REA-MOCK-A01')).toBe(false);
  });

  it('syncs embedded content.testId', () => {
    expect(
      syncContentTestId({ testId: 'OLD', passages: [] }, 'REA-MOCK-A002'),
    ).toEqual({ testId: 'REA-MOCK-A002', passages: [] });
    expect(syncContentTestId({ passages: [] }, 'REA-MOCK-A002')).toEqual({
      passages: [],
    });
  });

  it('finds max serial across mixed records', () => {
    expect(
      maxSerialFromTests([
        { code: 'REA-MOCK-A003', title: 'Reading Mock-A003' },
        { code: 'REA-ACAD-010', title: 'Reading — Academic Mock Copy' },
      ]),
    ).toBe(10);
  });
});
