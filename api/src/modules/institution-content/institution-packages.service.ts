import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ContentTestStatus,
  ContentTestType,
  EnrollmentStatus,
  ExamSkill,
  ExamType,
  Prisma,
  ResultsStatus,
} from '@prisma/client';
import { AuditAction } from '../../common/audit/audit.actions';
import { AuditService } from '../../common/audit/audit.service';
import {
  derivePackageKind,
  formatMockNumber,
  packageKindLabel,
  SKILL_TO_POOL_KEY,
  SKILL_TO_TEST_FIELD,
} from '../../common/package-kind';
import { suggestPackageTitle } from '../../common/package-naming';
import { requireInstitutionId } from '../../common/institution/institution-scope';
import {
  queryNextMockNumber,
  withUniqueRetry,
} from '../../common/id-allocation';
import { RequestUser } from '../../common/types/request-user';
import {
  assertPackageScopeMatch,
  packageScopeKey,
} from '../content/content-scope';
import { evaluatePackageAvailability } from '../content/content-assignment';
import { InstitutionMockSetsService } from '../institution-mock-sets/institution-mock-sets.service';
import { packageExamSkills } from '../content/package-skills';
import { PrismaService } from '../../prisma/prisma.service';

const DEFAULT_SKILLS = [
  'listening',
  'reading',
  'writing',
  'speaking',
] as const;

const POOL_SKILL_TYPE: Record<
  'listening' | 'reading' | 'writing' | 'speaking',
  ExamSkill
> = {
  listening: ExamSkill.LISTENING,
  reading: ExamSkill.READING,
  writing: ExamSkill.WRITING,
  speaking: ExamSkill.SPEAKING,
};

type SkillKey = 'listening' | 'reading' | 'writing' | 'speaking';

type ContentPoolEntry = { skill: SkillKey; testIds: string[] };

@Injectable()
export class InstitutionPackagesService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private mockSets: InstitutionMockSetsService,
  ) {}

  async listMine(user: RequestUser) {
    const institutionId = requireInstitutionId(user);
    const packages = await this.prisma.mockTestPackage.findMany({
      where: { institutionId },
      orderBy: [{ isActive: 'desc' }, { updatedAt: 'desc' }],
      include: {
        contentPool: { include: { test: { select: { id: true, code: true, title: true } } } },
      },
    });
    return packages.map((pkg) => this.mapPackage(pkg));
  }

  /**
   * Centre-assembled mocks only, with per-student completion status for the
   * enroll wizard filters (Not taken yet / In progress / Already completed).
   */
  async listEnrollmentPackages(
    user: RequestUser,
    studentId: string,
    packageKind?: string,
  ) {
    const institutionId = requireInstitutionId(user);
    if (!studentId?.trim()) {
      throw new BadRequestException('Query parameter "studentId" is required');
    }

    const student = await this.prisma.studentProfile.findUnique({
      where: { id: studentId.trim() },
      select: { id: true, institutionId: true },
    });

    if (!student || student.institutionId !== institutionId) {
      throw new NotFoundException('Student not found for this institution');
    }

    const packages = await this.prisma.mockTestPackage.findMany({
      where: {
        institutionId,
        isActive: true,
        ...(packageKind?.trim()
          ? { packageKind: packageKind.trim() }
          : {}),
      },
      orderBy: [{ packageKind: 'asc' }, { mockNumber: 'asc' }],
    });

    const mocks = [];
    for (const pkg of packages) {
      const skills = packageExamSkills(pkg.skills);
      const availability = await evaluatePackageAvailability(
        this.prisma,
        student.id,
        pkg,
      );
      const enrollment = await this.prisma.enrollment.findFirst({
        where: {
          studentId: student.id,
          packageId: pkg.id,
          status: { notIn: [EnrollmentStatus.CANCELLED, EnrollmentStatus.MISSED] },
        },
        orderBy: { createdAt: 'desc' },
        select: {
          enrollmentCode: true,
          mockDate: true,
          status: true,
          resultsStatus: true,
        },
      });

      let enrollStatus: 'available' | 'in_progress' | 'completed' | 'blocked' =
        'available';
      let statusLabel = 'Not taken yet';

      if (
        enrollment &&
        enrollment.status === EnrollmentStatus.COMPLETED &&
        enrollment.resultsStatus === ResultsStatus.RELEASED
      ) {
        enrollStatus = 'completed';
        statusLabel = 'Already completed';
      } else if (
        enrollment &&
        [
          EnrollmentStatus.ENROLLED,
          EnrollmentStatus.IN_PROGRESS,
          EnrollmentStatus.AWAITING_RESULTS,
          EnrollmentStatus.PENDING_PAYMENT,
        ].includes(enrollment.status)
      ) {
        enrollStatus = 'in_progress';
        statusLabel = 'In progress';
      } else if (!availability.canPurchase) {
        enrollStatus = 'blocked';
        statusLabel = 'Not available';
      }

      mocks.push({
        id: pkg.id,
        title: pkg.title,
        packageKind: pkg.packageKind,
        packageKindLabel: packageKindLabel(pkg.packageKind),
        mockNumber: pkg.mockNumber,
        mockLabel: formatMockNumber(pkg.packageKind, pkg.mockNumber),
        examType: pkg.examType,
        skills: skills.map((s) => s.toLowerCase()),
        needsWriting: skills.includes(ExamSkill.WRITING),
        needsSpeaking: skills.includes(ExamSkill.SPEAKING),
        enrollStatus,
        statusLabel,
        blockingReason: availability.blockingReason ?? undefined,
        enrollment: enrollment
          ? {
              enrollmentCode: enrollment.enrollmentCode,
              mockDate: enrollment.mockDate,
              status: enrollment.status,
              resultsStatus: enrollment.resultsStatus,
            }
          : undefined,
      });
    }

    return {
      studentId: student.id,
      mocks,
      /** @deprecated Use `mocks` — kept empty for older clients. */
      platform: [] as unknown[],
      /** @deprecated Use `mocks` — kept empty for older clients. */
      own: [] as unknown[],
    };
  }

  /** Read-only section tests from purchased / granted platform test sets. */
  async listPurchasedTests(user: RequestUser, type?: ContentTestType) {
    const institutionId = requireInstitutionId(user);
    const grantedPackageIds =
      await this.mockSets.listGrantedPackageIds(institutionId);

    if (grantedPackageIds.length === 0) {
      return { tests: [] as const, grantsCount: 0 };
    }

    const packages = await this.prisma.mockTestPackage.findMany({
      where: { id: { in: grantedPackageIds }, isActive: true },
      select: {
        id: true,
        title: true,
        packageKind: true,
        mockNumber: true,
        listeningTestId: true,
        readingTestId: true,
        writingTestId: true,
        speakingBankId: true,
        contentPool: {
          select: { testId: true, skill: true },
        },
      },
    });

    const testIds = new Set<string>();
    const sourceByTestId = new Map<
      string,
      { packageId: string; packageTitle: string; mockLabel: string }
    >();

    for (const pkg of packages) {
      const mockLabel = formatMockNumber(pkg.packageKind, pkg.mockNumber);
      const source = {
        packageId: pkg.id,
        packageTitle: pkg.title,
        mockLabel,
      };
      const ids = [
        pkg.listeningTestId,
        pkg.readingTestId,
        pkg.writingTestId,
        pkg.speakingBankId,
        ...pkg.contentPool.map((row) => row.testId),
      ].filter((id): id is string => Boolean(id));

      for (const id of ids) {
        testIds.add(id);
        if (!sourceByTestId.has(id)) sourceByTestId.set(id, source);
      }
    }

    if (testIds.size === 0) {
      return { tests: [], grantsCount: grantedPackageIds.length };
    }

    const tests = await this.prisma.contentTest.findMany({
      where: {
        id: { in: [...testIds] },
        ...(type ? { type } : {}),
      },
      orderBy: [{ type: 'asc' }, { code: 'asc' }],
      select: {
        id: true,
        code: true,
        title: true,
        type: true,
        status: true,
        version: true,
        durationMin: true,
        updatedAt: true,
        publishedAt: true,
      },
    });

    return {
      grantsCount: grantedPackageIds.length,
      tests: tests.map((test) => {
        const source = sourceByTestId.get(test.id);
        return {
          ...test,
          source: 'purchased' as const,
          sourcePackageId: source?.packageId ?? null,
          sourcePackageTitle: source?.packageTitle ?? null,
          sourceMockLabel: source?.mockLabel ?? null,
        };
      }),
    };
  }

  /**
   * Dual-source picker for mock assembly: centre published tests + purchased
   * set tests, with centre-mock exclusivity metadata for L/R/W.
   */
  async listMockContentTests(user: RequestUser, type?: ContentTestType) {
    const institutionId = requireInstitutionId(user);
    const [centreTests, purchased] = await Promise.all([
      this.prisma.contentTest.findMany({
        where: {
          institutionId,
          status: ContentTestStatus.PUBLISHED,
          ...(type ? { type } : {}),
        },
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          code: true,
          title: true,
          type: true,
          status: true,
        },
      }),
      this.listPurchasedTests(user, type),
    ]);

    const centreMockAssignments = await this.prisma.packageContentTest.findMany({
      where: {
        package: { institutionId },
        ...(type
          ? {
              skill:
                type === ContentTestType.LISTENING
                  ? ExamSkill.LISTENING
                  : type === ContentTestType.READING
                    ? ExamSkill.READING
                    : type === ContentTestType.WRITING
                      ? ExamSkill.WRITING
                      : ExamSkill.SPEAKING,
            }
          : {}),
      },
      include: {
        package: {
          select: {
            id: true,
            title: true,
            packageKind: true,
            mockNumber: true,
          },
        },
      },
    });

    const assignmentByTestId = new Map<
      string,
      {
        assignedMockId: string;
        assignedMockTitle: string;
        assignedMockLabel: string;
      }
    >();
    for (const row of centreMockAssignments) {
      if (!assignmentByTestId.has(row.testId)) {
        assignmentByTestId.set(row.testId, {
          assignedMockId: row.package.id,
          assignedMockTitle: row.package.title,
          assignedMockLabel: formatMockNumber(
            row.package.packageKind,
            row.package.mockNumber,
          ),
        });
      }
    }

    const byId = new Map<
      string,
      {
        id: string;
        code: string;
        title: string;
        type: string;
        status: string;
        source: 'centre' | 'purchased';
        isPackaged: boolean;
        assignedMockId: string | null;
        assignedMockTitle: string | null;
        assignedMockLabel: string | null;
      }
    >();

    for (const test of centreTests) {
      const assigned = assignmentByTestId.get(test.id);
      byId.set(test.id, {
        id: test.id,
        code: test.code,
        title: test.title,
        type: test.type,
        status: test.status,
        source: 'centre',
        isPackaged: Boolean(assigned),
        assignedMockId: assigned?.assignedMockId ?? null,
        assignedMockTitle: assigned?.assignedMockTitle ?? null,
        assignedMockLabel: assigned?.assignedMockLabel ?? null,
      });
    }

    for (const test of purchased.tests) {
      if (byId.has(test.id)) continue;
      if (test.status !== ContentTestStatus.PUBLISHED) continue;
      const assigned = assignmentByTestId.get(test.id);
      byId.set(test.id, {
        id: test.id,
        code: test.code,
        title: test.title,
        type: test.type,
        status: test.status,
        source: 'purchased',
        isPackaged: Boolean(assigned),
        assignedMockId: assigned?.assignedMockId ?? null,
        assignedMockTitle: assigned?.assignedMockTitle ?? null,
        assignedMockLabel: assigned?.assignedMockLabel ?? null,
      });
    }

    return {
      tests: [...byId.values()].sort((a, b) => a.code.localeCompare(b.code)),
    };
  }

  async suggestNextPackage(
    user: RequestUser,
    opts?: { packageKind?: string; examType?: ExamType; skills?: string[] },
  ) {
    const institutionId = requireInstitutionId(user);
    const skills: string[] = opts?.skills?.length
      ? opts.skills
      : opts?.packageKind
        ? opts.packageKind.split('+').filter(Boolean)
        : [...DEFAULT_SKILLS];
    const packageKind = opts?.packageKind ?? derivePackageKind(skills);
    const examType = opts?.examType ?? ExamType.ACADEMIC;
    const mockNumber = await queryNextMockNumber(this.prisma, {
      scopeKey: packageScopeKey(institutionId),
      packageKind,
      institutionId,
    });
    const title = suggestPackageTitle(examType, packageKind, mockNumber);
    return {
      title,
      mockLabel: formatMockNumber(packageKind, mockNumber),
      mockNumber,
      packageKind,
      examType,
    };
  }

  async createPackage(
    user: RequestUser,
    dto: {
      title?: string;
      examType?: ExamType;
      skills?: string[];
      description?: string;
    },
  ) {
    const institutionId = requireInstitutionId(user);
    const institution = await this.prisma.institution.findUnique({
      where: { id: institutionId },
      select: { slug: true },
    });
    if (!institution) throw new NotFoundException('Institution not found');

    const skills = (dto.skills ?? [...DEFAULT_SKILLS]) as Prisma.InputJsonValue;
    const packageKind = derivePackageKind(skills);
    const examType = dto.examType ?? ExamType.ACADEMIC;
    const scopeKey = packageScopeKey(institutionId);

    const created = await withUniqueRetry(async () => {
      const nextMockNumber = await queryNextMockNumber(this.prisma, {
        scopeKey,
        packageKind,
        institutionId,
      });
      const title =
        dto.title?.trim() ||
        suggestPackageTitle(examType, packageKind, nextMockNumber);
      const slug = await this.resolveSlug(institution.slug, title);

      return this.prisma.mockTestPackage.create({
        data: {
          slug,
          title,
          description: dto.description?.trim() || null,
          price: 0,
          currency: 'UZS',
          examType,
          packageKind,
          mockNumber: nextMockNumber,
          scopeKey,
          institutionId,
          skills,
          included: [] as Prisma.InputJsonValue,
          rules: [] as Prisma.InputJsonValue,
          isActive: false,
        },
      });
    });

    await this.audit.log({
      userId: user.id,
      action: AuditAction.INSTITUTION_PACKAGE_CREATE,
      entity: 'mock_test_package',
      entityId: created.id,
      metadata: { title: created.title, institutionId },
    });

    return this.mapPackage(created);
  }

  async updatePackageLinks(
    user: RequestUser,
    packageId: string,
    links: {
      listeningTestId?: string | null;
      readingTestId?: string | null;
      writingTestId?: string | null;
      speakingBankId?: string | null;
    },
  ) {
    const institutionId = requireInstitutionId(user);
    const pkg = await this.prisma.mockTestPackage.findUnique({
      where: { id: packageId },
    });
    if (!pkg) throw new NotFoundException('Package not found');
    assertPackageScopeMatch(pkg, { institutionId });

    const pool = this.buildContentPoolFromLinks(pkg.skills, links);
    await this.assertPackageContentLinks(institutionId, pkg.skills, pool, packageId);
    await this.syncContentPool(packageId, pool);

    const updated = await this.prisma.mockTestPackage.update({
      where: { id: packageId },
      data: {
        listeningTestId: links.listeningTestId || null,
        readingTestId: links.readingTestId || null,
        writingTestId: links.writingTestId || null,
        speakingBankId: links.speakingBankId || null,
      },
    });

    await this.audit.log({
      userId: user.id,
      action: AuditAction.INSTITUTION_PACKAGE_UPDATE,
      entity: 'mock_test_package',
      entityId: packageId,
      metadata: { title: updated.title, institutionId },
    });

    return this.mapPackage(updated);
  }

  async activatePackage(user: RequestUser, packageId: string) {
    const institutionId = requireInstitutionId(user);
    const pkg = await this.prisma.mockTestPackage.findUnique({
      where: { id: packageId },
    });
    if (!pkg) throw new NotFoundException('Package not found');
    assertPackageScopeMatch(pkg, { institutionId });

    const pool = await this.prisma.packageContentTest.findMany({
      where: { packageId },
    });
    const required = packageExamSkills(pkg.skills);
    for (const skill of required) {
      if (!pool.some((row) => row.skill === skill)) {
        throw new BadRequestException(
          `Assign a published ${skill.toLowerCase()} test before activating`,
        );
      }
    }

    const updated = await this.prisma.mockTestPackage.update({
      where: { id: packageId },
      data: { isActive: true },
    });
    return this.mapPackage(updated);
  }

  async listPublishedTests(user: RequestUser, type?: ContentTestType) {
    const institutionId = requireInstitutionId(user);
    return this.prisma.contentTest.findMany({
      where: {
        institutionId,
        status: ContentTestStatus.PUBLISHED,
        ...(type ? { type } : {}),
      },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, code: true, title: true, type: true, status: true },
    });
  }

  private mapPackage(
    pkg: {
      id: string;
      slug: string;
      title: string;
      description: string | null;
      packageKind: string;
      mockNumber: number;
      examType: ExamType;
      skills: unknown;
      isActive: boolean;
      listeningTestId: string | null;
      readingTestId: string | null;
      writingTestId: string | null;
      speakingBankId: string | null;
    },
  ) {
    return {
      id: pkg.id,
      slug: pkg.slug,
      title: pkg.title,
      description: pkg.description,
      packageKind: pkg.packageKind,
      packageKindLabel: packageKindLabel(pkg.packageKind),
      mockNumber: pkg.mockNumber,
      mockLabel: formatMockNumber(pkg.packageKind, pkg.mockNumber),
      examType: pkg.examType,
      skills: pkg.skills,
      isActive: pkg.isActive,
      listeningTestId: pkg.listeningTestId,
      readingTestId: pkg.readingTestId,
      writingTestId: pkg.writingTestId,
      speakingBankId: pkg.speakingBankId,
    };
  }

  private async nextMockNumber(institutionId: string, packageKind: string) {
    return queryNextMockNumber(this.prisma, {
      scopeKey: packageScopeKey(institutionId),
      packageKind,
      institutionId,
    });
  }

  private async resolveSlug(institutionSlug: string, title: string) {
    const base = `${institutionSlug}-${title}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48);
    let candidate = base || `${institutionSlug}-mock`;
    let suffix = 1;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const existing = await this.prisma.mockTestPackage.findUnique({
        where: { slug: candidate },
      });
      if (!existing) return candidate;
      suffix += 1;
      candidate = `${base}-${suffix}`.slice(0, 56);
    }
  }

  private buildContentPoolFromLinks(
    skills: unknown,
    links: {
      listeningTestId?: string | null;
      readingTestId?: string | null;
      writingTestId?: string | null;
      speakingBankId?: string | null;
    },
  ): ContentPoolEntry[] {
    const pool: ContentPoolEntry[] = [];
    for (const skill of packageExamSkills(skills)) {
      const key = SKILL_TO_POOL_KEY[skill];
      const field = SKILL_TO_TEST_FIELD[skill];
      const testId = links[field as keyof typeof links];
      if (testId) pool.push({ skill: key, testIds: [testId] });
    }
    return pool;
  }

  private async assertPackageContentLinks(
    institutionId: string,
    skills: unknown,
    pool: ContentPoolEntry[],
    excludePackageId?: string,
  ) {
    const requiredSkills = packageExamSkills(skills);
    for (const skill of requiredSkills) {
      const key = SKILL_TO_POOL_KEY[skill];
      const testIds = pool.find((e) => e.skill === key)?.testIds ?? [];
      if (testIds.length !== 1) {
        throw new BadRequestException(
          `Select exactly one published ${key} test for this package`,
        );
      }
    }

    const allIds = pool.flatMap((e) => e.testIds);
    if (new Set(allIds).size !== allIds.length) {
      throw new BadRequestException(
        'The same test cannot be linked to multiple skills',
      );
    }

    if (allIds.length === 0) return;

    const tests = await this.prisma.contentTest.findMany({
      where: { id: { in: allIds } },
      select: { id: true, code: true, type: true, status: true, institutionId: true },
    });
    const byId = new Map(tests.map((t) => [t.id, t]));

    const grantedPackageIds =
      await this.mockSets.listGrantedPackageIds(institutionId);
    const grantedTestIds = new Set<string>();
    if (grantedPackageIds.length > 0) {
      const grantedPackages = await this.prisma.mockTestPackage.findMany({
        where: { id: { in: grantedPackageIds } },
        select: {
          listeningTestId: true,
          readingTestId: true,
          writingTestId: true,
          speakingBankId: true,
          contentPool: { select: { testId: true } },
        },
      });
      for (const pkg of grantedPackages) {
        for (const id of [
          pkg.listeningTestId,
          pkg.readingTestId,
          pkg.writingTestId,
          pkg.speakingBankId,
          ...pkg.contentPool.map((row) => row.testId),
        ]) {
          if (id) grantedTestIds.add(id);
        }
      }
    }

    for (const entry of pool) {
      const test = byId.get(entry.testIds[0]!);
      if (!test) throw new BadRequestException('Selected test not found');
      const isCentreTest = test.institutionId === institutionId;
      const isPurchasedTest =
        test.institutionId == null && grantedTestIds.has(test.id);
      if (!isCentreTest && !isPurchasedTest) {
        throw new BadRequestException(
          "Only your centre's published tests or tests from purchased test sets can be linked",
        );
      }
      if (test.status !== ContentTestStatus.PUBLISHED) {
        throw new BadRequestException(
          `Test ${test.code} must be published before linking`,
        );
      }
      const expected = POOL_SKILL_TYPE[entry.skill];
      if (test.type !== expected) {
        throw new BadRequestException(
          `Test ${test.code} is not a ${entry.skill} test`,
        );
      }
    }

    const exclusiveIds = pool
      .filter((e) => e.skill !== 'speaking')
      .flatMap((e) => e.testIds);

    if (exclusiveIds.length > 0) {
      const conflicts = await this.prisma.packageContentTest.findMany({
        where: {
          testId: { in: exclusiveIds },
          ...(excludePackageId ? { packageId: { not: excludePackageId } } : {}),
          package: { institutionId },
        },
        include: {
          test: { select: { code: true } },
          package: { select: { title: true, mockNumber: true, packageKind: true } },
        },
      });
      if (conflicts.length > 0) {
        const c = conflicts[0]!;
        throw new BadRequestException(
          `Test ${c.test.code} is already used in ${formatMockNumber(c.package.packageKind, c.package.mockNumber)} (${c.package.title})`,
        );
      }
    }
  }

  private async syncContentPool(packageId: string, pool: ContentPoolEntry[]) {
    const rows = pool.flatMap((entry) =>
      entry.testIds.map((testId) => ({
        packageId,
        testId,
        skill: POOL_SKILL_TYPE[entry.skill],
      })),
    );

    const fkUpdates: Prisma.MockTestPackageUpdateInput = {
      listeningTest: { disconnect: true },
      readingTest: { disconnect: true },
      writingTest: { disconnect: true },
      speakingBank: { disconnect: true },
    };
    for (const row of rows) {
      const relationKey =
        row.skill === ExamSkill.LISTENING
          ? 'listeningTest'
          : row.skill === ExamSkill.READING
            ? 'readingTest'
            : row.skill === ExamSkill.WRITING
              ? 'writingTest'
              : 'speakingBank';
      (fkUpdates as Record<string, unknown>)[relationKey] = {
        connect: { id: row.testId },
      };
    }

    await this.prisma.$transaction([
      this.prisma.packageContentTest.deleteMany({ where: { packageId } }),
      ...(rows.length > 0
        ? [this.prisma.packageContentTest.createMany({ data: rows })]
        : []),
      this.prisma.mockTestPackage.update({
        where: { id: packageId },
        data: fkUpdates,
      }),
    ]);
  }
}
