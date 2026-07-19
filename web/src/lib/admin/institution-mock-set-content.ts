import type {
  MockSetContentOptionPackage,
  MockSetContentOptionTest,
} from "@/lib/api/admin-institution-mock-sets";

export type MockSetPickerTab = "listening" | "reading" | "writing";

export function isPackageSelectable(
  pkg: MockSetContentOptionPackage,
  selectedPackageIds: Set<string>,
  currentSetId?: string,
): boolean {
  if (selectedPackageIds.has(pkg.id)) return true;
  if (!pkg.isAssigned) return true;
  return pkg.assignedSetId === currentSetId;
}

export function isTestSelectable(
  test: MockSetContentOptionTest,
  selectedTestIds: Set<string>,
  currentSetId?: string,
): boolean {
  if (selectedTestIds.has(test.id)) return true;
  if (!test.isAssigned) return true;
  return test.assignedSetId === currentSetId;
}

export function formatMockSetSelectionSummary(
  packageCount: number,
  listening: number,
  reading: number,
  writing: number,
): string {
  const parts: string[] = [];
  if (listening > 0) parts.push(`${listening} Listening`);
  if (reading > 0) parts.push(`${reading} Reading`);
  if (writing > 0) parts.push(`${writing} Writing`);
  if (parts.length === 0 && packageCount > 0) {
    return `${packageCount} package${packageCount === 1 ? "" : "s"}`;
  }
  return parts.join(" · ") || "—";
}
