export type PackageTypeTabId =
  | "all"
  | "full-academic"
  | "full-gt"
  | "speaking"
  | "writing"
  | "listening"
  | "reading"
  | "listening-reading"
  | "writing-speaking";

export type PackageTypeTab = {
  id: PackageTypeTabId;
  label: string;
  packageKind?: string;
  examType?: "ACADEMIC" | "GENERAL_TRAINING";
};

/** Hidden from student browse and admin type tab bars. */
export const EXCLUDED_PACKAGE_TYPE_TAB_IDS: PackageTypeTabId[] = [
  "full-gt",
  "listening-reading",
  "writing-speaking",
];

export const PACKAGE_TYPE_TABS: PackageTypeTab[] = [
  { id: "all", label: "All Types" },
  {
    id: "full-academic",
    label: "Full Academic",
    packageKind: "listening+reading+writing+speaking",
    examType: "ACADEMIC",
  },
  {
    id: "full-gt",
    label: "General Training",
    packageKind: "listening+reading+writing+speaking",
    examType: "GENERAL_TRAINING",
  },
  {
    id: "speaking",
    label: "Speaking Only",
    packageKind: "speaking",
    examType: "ACADEMIC",
  },
  {
    id: "writing",
    label: "Writing Only",
    packageKind: "writing",
    examType: "ACADEMIC",
  },
  {
    id: "listening",
    label: "Listening Only",
    packageKind: "listening",
    examType: "ACADEMIC",
  },
  {
    id: "reading",
    label: "Reading Only",
    packageKind: "reading",
    examType: "ACADEMIC",
  },
  {
    id: "listening-reading",
    label: "Listening & Reading",
    packageKind: "listening+reading",
    examType: "ACADEMIC",
  },
  {
    id: "writing-speaking",
    label: "Writing & Speaking",
    packageKind: "writing+speaking",
    examType: "ACADEMIC",
  },
];

/** Tabs shown in student browse and admin package filters. */
export const VISIBLE_PACKAGE_TYPE_TABS = PACKAGE_TYPE_TABS.filter(
  (tab) => !EXCLUDED_PACKAGE_TYPE_TAB_IDS.includes(tab.id),
);

/** Student browse tabs — no "All" aggregate tab. */
export const STUDENT_BROWSE_TYPE_TABS = VISIBLE_PACKAGE_TYPE_TABS.filter(
  (tab) => tab.id !== "all",
);

export function isExcludedPackageTypeTab(tabId: string): boolean {
  return EXCLUDED_PACKAGE_TYPE_TAB_IDS.includes(tabId as PackageTypeTabId);
}

export function packageMatchesTypeTab(
  pkg: { packageKind?: string; examType: string },
  tabId: PackageTypeTabId,
): boolean {
  if (tabId === "all") return true;
  const tab = PACKAGE_TYPE_TABS.find((t) => t.id === tabId);
  if (!tab?.packageKind) return true;
  return (
    pkg.packageKind === tab.packageKind &&
    (!tab.examType || pkg.examType === tab.examType)
  );
}

export function isPackageTypeTabId(value: string): value is PackageTypeTabId {
  return PACKAGE_TYPE_TABS.some((tab) => tab.id === value);
}
