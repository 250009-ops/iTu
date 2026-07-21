import { ExamType } from '@prisma/client';
import { suggestPackageTitle } from './package-naming';

describe('package-naming', () => {
  it('titles full academic packages with serial', () => {
    expect(
      suggestPackageTitle(
        ExamType.ACADEMIC,
        'listening+reading+writing+speaking',
        1,
      ),
    ).toBe('Full Academic Mock-A001');
    expect(
      suggestPackageTitle(
        ExamType.ACADEMIC,
        'listening+reading+writing+speaking',
        12,
      ),
    ).toBe('Full Academic Mock-A012');
  });

  it('titles general training full mocks', () => {
    expect(
      suggestPackageTitle(
        ExamType.GENERAL_TRAINING,
        'listening+reading+writing+speaking',
        2,
      ),
    ).toBe('General Training Mock-A002');
  });

  it('titles single-skill packages from mock label', () => {
    expect(suggestPackageTitle(ExamType.ACADEMIC, 'speaking', 1)).toBe(
      'Speaking Only Mock-A001',
    );
    expect(suggestPackageTitle(ExamType.ACADEMIC, 'writing', 3)).toBe(
      'Writing Only Mock-A003',
    );
  });
});
