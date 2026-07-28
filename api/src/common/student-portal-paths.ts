/** Deep links into student portals (marketplace vs institution). */

export function studentResultsPath(
  institutionId: string | null | undefined,
  enrollmentCode?: string | null,
): string {
  const base = institutionId ? '/inst-student/results' : '/student/results';
  if (!enrollmentCode) return base;
  return `${base}?enrollment=${encodeURIComponent(enrollmentCode)}`;
}

export function studentMockDayPath(
  institutionId: string | null | undefined,
): string {
  return institutionId ? '/inst-student/my-mock' : '/student/mock-day';
}
