import { ExamType } from '@prisma/client';
import { offerDisplayTitle } from './package-naming';
import { packageKindLabel } from './package-kind';

const FULL_KIND = 'listening+reading+writing+speaking';

export type OfferGroup = {
  packageKind: string;
  examType: ExamType;
};

const TAB_ORDER: Array<{
  tabId: string;
  packageKind: string;
  examType?: ExamType;
  label: string;
}> = [
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
  { tabId: 'speaking', packageKind: 'speaking', label: 'Speaking Only' },
  { tabId: 'writing', packageKind: 'writing', label: 'Writing Only' },
  { tabId: 'listening', packageKind: 'listening', label: 'Listening Only' },
  { tabId: 'reading', packageKind: 'reading', label: 'Reading Only' },
  {
    tabId: 'listening-reading',
    packageKind: 'listening+reading',
    label: 'Listening & Reading',
  },
  {
    tabId: 'writing-speaking',
    packageKind: 'writing+speaking',
    label: 'Writing & Speaking',
  },
];

export function buildTabId(packageKind: string, examType: ExamType): string {
  const preset = TAB_ORDER.find(
    (t) =>
      t.packageKind === packageKind &&
      (t.examType == null || t.examType === examType),
  );
  if (preset) return preset.tabId;
  return `${packageKind.replace(/\+/g, '-')}-${examType.toLowerCase()}`;
}

export function buildTabLabel(packageKind: string, examType: ExamType): string {
  const preset = TAB_ORDER.find(
    (t) =>
      t.packageKind === packageKind &&
      (t.examType == null || t.examType === examType),
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
    TAB_ORDER.map((t, i) => [
      `${t.packageKind}:${t.examType ?? '*'}`,
      i,
    ]),
  );

  return [...groups].sort((a, b) => {
    const aKey = `${a.packageKind}:${TAB_ORDER.find((t) => t.packageKind === a.packageKind && (t.examType == null || t.examType === a.examType))?.examType ?? '*'}`;
    const bKey = `${b.packageKind}:${TAB_ORDER.find((t) => t.packageKind === b.packageKind && (t.examType == null || t.examType === b.examType))?.examType ?? '*'}`;
    const aIdx = orderIndex.get(aKey) ?? 999;
    const bIdx = orderIndex.get(bKey) ?? 999;
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
