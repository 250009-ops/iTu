import { ExamType } from '@prisma/client';
import {
  buildTabId,
  buildTabLabel,
  isExcludedStudentOfferTab,
  offerMetaForGroup,
  sortOfferGroups,
  STUDENT_BROWSE_TAB_ORDER,
} from './catalog-offers';
import { offerDisplayTitle } from './package-naming';

describe('catalog-offers', () => {
  it('builds stable tab ids and labels', () => {
    expect(
      buildTabId('listening+reading+writing+speaking', ExamType.ACADEMIC),
    ).toBe('full-academic');
    expect(
      buildTabLabel('listening+reading+writing+speaking', ExamType.ACADEMIC),
    ).toBe('Full Academic');
    expect(buildTabId('speaking', ExamType.ACADEMIC)).toBe('speaking');
    expect(buildTabLabel('speaking', ExamType.ACADEMIC)).toBe('Speaking Only');
  });

  it('hides mock serial numbers in display titles', () => {
    expect(
      offerDisplayTitle('listening+reading+writing+speaking', ExamType.ACADEMIC),
    ).toBe('Full Academic Mock');
    expect(offerDisplayTitle('speaking', ExamType.ACADEMIC)).toBe(
      'Speaking Only',
    );
  });

  it('sorts offer groups in canonical tab order', () => {
    const sorted = sortOfferGroups([
      { packageKind: 'writing', examType: ExamType.ACADEMIC },
      {
        packageKind: 'listening+reading+writing+speaking',
        examType: ExamType.ACADEMIC,
      },
      { packageKind: 'speaking', examType: ExamType.ACADEMIC },
    ]);

    expect(sorted.map((g) => g.packageKind)).toEqual([
      'listening+reading+writing+speaking',
      'speaking',
      'writing',
    ]);
  });

  it('exposes canonical student browse tabs', () => {
    expect(STUDENT_BROWSE_TAB_ORDER).toHaveLength(5);
    expect(STUDENT_BROWSE_TAB_ORDER.map((g) => g.packageKind)).toEqual([
      'listening+reading+writing+speaking',
      'speaking',
      'writing',
      'listening',
      'reading',
    ]);
  });

  it('excludes general training and combo types from student tabs', () => {
    expect(isExcludedStudentOfferTab('full-gt')).toBe(true);
    expect(isExcludedStudentOfferTab('listening-reading')).toBe(true);
    expect(isExcludedStudentOfferTab('writing-speaking')).toBe(true);
    expect(isExcludedStudentOfferTab('full-academic')).toBe(false);
  });

  it('returns offer metadata for a group', () => {
    expect(
      offerMetaForGroup({
        packageKind: 'speaking',
        examType: ExamType.ACADEMIC,
      }),
    ).toEqual({
      tabId: 'speaking',
      label: 'Speaking Only',
      displayTitle: 'Speaking Only',
      packageKind: 'speaking',
      examType: ExamType.ACADEMIC,
    });
  });
});
