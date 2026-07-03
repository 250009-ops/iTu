import { ExamType } from '@prisma/client';
import { offerDisplayTitle } from './package-naming';
import { packageKindLabel } from './package-kind';

const FULL_KIND = 'listening+reading+writing+speaking';

export type OfferGroup = {
  packageKind: string;
  examType: ExamType;
};

export type PackageTypeTab = {
  tabId: string;
  packageKind: string;
  examType: ExamType;
  label: string;
};

const TAB_ORDER: PackageTypeTab[] = [
  {
    tabId: 'full-academic',
    packageKind: FULL_KIND,
    examType: ExamType.ACADEMIC,
    label: 'Full Academic',
  },
  {
    tabId: 'full-gt',
    packageKind: FULL_KIND,
    examType: ExamType.GENERAL_TRAINING,
    label: 'General Training',
  },
  {
    tabId: 'speaking',
    packageKind: 'speaking',
    examType: ExamType.ACADEMIC,
    label: 'Speaking Only',
  },
  {
    tabId: 'writing',
    packageKind: 'writing',
    examType: ExamType.ACADEMIC,
    label: 'Writing Only',
  },
  {
    tabId: 'listening',
    packageKind: 'listening',
    examType: ExamType.ACADEMIC,
    label: 'Listening Only',
  },
  {
    tabId: 'reading',
    packageKind: 'reading',
    examType: ExamType.ACADEMIC,
    label: 'Reading Only',
  },
  {
    tabId: 'listening-reading',
    packageKind: 'listening+reading',
    examType: ExamType.ACADEMIC,
    label: 'Listening & Reading',
  },
  {
    tabId: 'writing-speaking',
    packageKind: 'writing+speaking',
    examType: ExamType.ACADEMIC,
    label: 'Writing & Speaking',
  },
];

/** Canonical student browse tabs — always shown even when a type has no offer. */
export const STUDENT_BROWSE_TAB_ORDER: OfferGroup[] = TAB_ORDER.map(
  ({ packageKind, examType }) => ({ packageKind, examType }),
);

export function groupKey(packageKind: string, examType: ExamType) {
  return `${packageKind}:${examType}`;
}

export function matchesPackageTypeTab(
  packageKind: string,
  examType: string,
  tabId: string,
): boolean {
  const tab = TAB_ORDER.find((t) => t.tabId === tabId);
  if (!tab) return false;
  return tab.packageKind === packageKind && tab.examType === examType;
}

export function buildTabId(packageKind: string, examType: ExamType): string {
  const preset = TAB_ORDER.find(
    (t) => t.packageKind === packageKind && t.examType === examType,
  );
  if (preset) return preset.tabId;
  return `${packageKind.replace(/\+/g, '-')}-${examType.toLowerCase()}`;
}

export function buildTabLabel(packageKind: string, examType: ExamType): string {
  const preset = TAB_ORDER.find(
    (t) => t.packageKind === packageKind && t.examType === examType,
  );
  if (preset) return preset.label;
  if (packageKind === FULL_KIND) {
    return examType === ExamType.GENERAL_TRAINING
      ? 'General Training'
      : 'Full Academic';
  }
  return packageKindLabel(packageKind);
}

export function sortOfferGroups(groups: OfferGroup[]): OfferGroup[] {
  const orderIndex = new Map(
    TAB_ORDER.map((t, i) => [groupKey(t.packageKind, t.examType), i]),
  );

  return [...groups].sort((a, b) => {
    const aIdx = orderIndex.get(groupKey(a.packageKind, a.examType)) ?? 999;
    const bIdx = orderIndex.get(groupKey(b.packageKind, b.examType)) ?? 999;
    if (aIdx !== bIdx) return aIdx - bIdx;
    if (a.packageKind !== b.packageKind) {
      return a.packageKind.localeCompare(b.packageKind);
    }
    return a.examType.localeCompare(b.examType);
  });
}

export function offerMetaForGroup(group: OfferGroup) {
  return {
    tabId: buildTabId(group.packageKind, group.examType),
    label: buildTabLabel(group.packageKind, group.examType),
    displayTitle: offerDisplayTitle(group.packageKind, group.examType),
    packageKind: group.packageKind,
    examType: group.examType,
  };
}
