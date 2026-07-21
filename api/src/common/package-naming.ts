import { ExamType } from '@prisma/client';
import {
  formatMockNumber,
  formatMockSerial,
  packageKindLabel,
} from './package-kind';

const FULL_PACKAGE_KIND = 'listening+reading+writing+speaking';

/** Stable student-facing title — hides internal mock serial numbers. */
export function offerDisplayTitle(
  packageKind: string,
  examType: ExamType,
): string {
  if (packageKind === FULL_PACKAGE_KIND) {
    if (examType === ExamType.GENERAL_TRAINING) {
      return 'General Training Mock';
    }
    return 'Full Academic Mock';
  }
  return packageKindLabel(packageKind);
}

/** Canonical admin/marketing title for a new package row. */
export function suggestPackageTitle(
  examType: ExamType,
  packageKind: string,
  mockNumber: number,
): string {
  const serial = formatMockSerial(mockNumber);
  if (packageKind === FULL_PACKAGE_KIND) {
    if (examType === ExamType.GENERAL_TRAINING) {
      return `General Training Mock-${serial}`;
    }
    return `Full Academic Mock-${serial}`;
  }
  return formatMockNumber(packageKind, mockNumber);
}
