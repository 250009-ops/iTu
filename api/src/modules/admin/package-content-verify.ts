import { ExamSkill } from '@prisma/client';

export type PackageContentLink = {
  packageSlug: string;
  packageActive: boolean;
  skill: ExamSkill;
  testId: string;
};

export type ExclusiveContentConflict = {
  testId: string;
  skill: ExamSkill;
  packages: string[];
};

const EXCLUSIVE_SKILLS = new Set<ExamSkill>([
  ExamSkill.LISTENING,
  ExamSkill.READING,
  ExamSkill.WRITING,
]);

/** Groups duplicate exclusive L/R/W assignments across active packages. */
export function findExclusiveContentConflicts(
  links: PackageContentLink[],
): ExclusiveContentConflict[] {
  const byTest = new Map<string, ExclusiveContentConflict>();

  for (const link of links) {
    if (!EXCLUSIVE_SKILLS.has(link.skill) || !link.packageActive) continue;

    const key = `${link.skill}:${link.testId}`;
    const existing = byTest.get(key);
    if (existing) {
      existing.packages.push(link.packageSlug);
      continue;
    }
    byTest.set(key, {
      testId: link.testId,
      skill: link.skill,
      packages: [link.packageSlug],
    });
  }

  return [...byTest.values()].filter((entry) => entry.packages.length > 1);
}

export function formatExclusiveContentConflict(
  conflict: ExclusiveContentConflict,
): string {
  return (
    `${conflict.skill} test ${conflict.testId} is linked to multiple active packages: ` +
    conflict.packages.join(', ')
  );
}
