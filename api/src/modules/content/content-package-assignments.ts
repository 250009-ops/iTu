import { ExamSkill, PrismaClient } from '@prisma/client';
import { formatMockNumber } from '../../common/package-kind';

export type ContentTestPackageAssignment = {
  testId: string;
  packageId: string;
  packageTitle: string;
  mockLabel: string;
  skill: ExamSkill;
  isActive: boolean;
};

const FK_SKILL_FIELDS: {
  skill: ExamSkill;
  field: 'listeningTestId' | 'readingTestId' | 'writingTestId' | 'speakingBankId';
}[] = [
  { skill: ExamSkill.LISTENING, field: 'listeningTestId' },
  { skill: ExamSkill.READING, field: 'readingTestId' },
  { skill: ExamSkill.WRITING, field: 'writingTestId' },
  { skill: ExamSkill.SPEAKING, field: 'speakingBankId' },
];

/** All package links for content tests (pool rows plus legacy FKs). */
export async function findContentTestPackageAssignments(
  prisma: PrismaClient,
  testIds?: string[],
): Promise<ContentTestPackageAssignment[]> {
  const poolRows = await prisma.packageContentTest.findMany({
    where: testIds ? { testId: { in: testIds } } : undefined,
    select: {
      testId: true,
      skill: true,
      package: {
        select: {
          id: true,
          title: true,
          mockNumber: true,
          packageKind: true,
          isActive: true,
        },
      },
    },
  });

  const assignments: ContentTestPackageAssignment[] = poolRows.map((row) => ({
    testId: row.testId,
    packageId: row.package.id,
    packageTitle: row.package.title,
    mockLabel: formatMockNumber(row.package.packageKind, row.package.mockNumber),
    skill: row.skill,
    isActive: row.package.isActive,
  }));

  const seen = new Set(
    assignments.map((a) => `${a.testId}:${a.packageId}:${a.skill}`),
  );

  const fkWhere = testIds
    ? {
        OR: [
          { listeningTestId: { in: testIds } },
          { readingTestId: { in: testIds } },
          { writingTestId: { in: testIds } },
          { speakingBankId: { in: testIds } },
        ],
      }
    : {};

  const fkPackages = await prisma.mockTestPackage.findMany({
    where: fkWhere,
    select: {
      id: true,
      title: true,
      mockNumber: true,
      packageKind: true,
      isActive: true,
      listeningTestId: true,
      readingTestId: true,
      writingTestId: true,
      speakingBankId: true,
    },
  });

  for (const pkg of fkPackages) {
    for (const { skill, field } of FK_SKILL_FIELDS) {
      const testId = pkg[field];
      if (!testId || (testIds && !testIds.includes(testId))) continue;
      const key = `${testId}:${pkg.id}:${skill}`;
      if (seen.has(key)) continue;
      seen.add(key);
      assignments.push({
        testId,
        packageId: pkg.id,
        packageTitle: pkg.title,
        mockLabel: formatMockNumber(pkg.packageKind, pkg.mockNumber),
        skill,
        isActive: pkg.isActive,
      });
    }
  }

  return assignments;
}

export function groupAssignmentsByTestId(
  assignments: ContentTestPackageAssignment[],
): Map<string, ContentTestPackageAssignment[]> {
  const map = new Map<string, ContentTestPackageAssignment[]>();
  for (const assignment of assignments) {
    const list = map.get(assignment.testId) ?? [];
    list.push(assignment);
    map.set(assignment.testId, list);
  }
  return map;
}

export function summarizeAssignmentsForTest(
  assignments: ContentTestPackageAssignment[],
) {
  const byPackage = new Map<string, ContentTestPackageAssignment>();
  for (const assignment of assignments) {
    byPackage.set(assignment.packageId, assignment);
  }
  const packages = [...byPackage.values()];
  const activePackages = packages.filter((p) => p.isActive);

  return {
    linkedPackages: packages.length,
    activePackageLinks: activePackages.length,
    assignedPackageId: packages[0]?.packageId ?? null,
    assignedPackageTitle: packages[0]?.packageTitle ?? null,
    assignedMockLabels: packages.map((p) => p.mockLabel),
    assignedMockLabel:
      packages.length === 0
        ? null
        : packages.length === 1
          ? packages[0]!.mockLabel
          : `${packages.length} packages`,
    isPackaged: packages.length > 0,
  };
}
