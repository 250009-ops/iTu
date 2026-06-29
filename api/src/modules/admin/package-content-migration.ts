export type ExclusiveAssignmentConflict = {
  skill: string;
  testId: string;
  packageSlug: string;
  ownerSlug: string;
  ownerSkill: string;
};

/**
 * Returns a conflict when an exclusive L/R/W test is already assigned to another package.
 */
export function detectExclusiveAssignmentConflict(
  assignedTests: Map<string, { slug: string; skill: string }>,
  pkgSlug: string,
  skill: string,
  testId: string,
): ExclusiveAssignmentConflict | null {
  const owner = assignedTests.get(testId);
  if (!owner) return null;
  return {
    skill,
    testId,
    packageSlug: pkgSlug,
    ownerSlug: owner.slug,
    ownerSkill: owner.skill,
  };
}

export function formatExclusiveAssignmentConflict(
  conflict: ExclusiveAssignmentConflict,
): string {
  return (
    `${conflict.skill} test ${conflict.testId} on "${conflict.packageSlug}" ` +
    `conflicts with "${conflict.ownerSlug}" (${conflict.ownerSkill})`
  );
}
