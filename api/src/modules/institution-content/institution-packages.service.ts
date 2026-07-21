import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ContentTestStatus,
  ContentTestType,
  ExamSkill,
  ExamType,
  Prisma,
} from '@prisma/client';
import { AuditAction } from '../../common/audit/audit.actions';
import { AuditService } from '../../common/audit/audit.service';
import { groupKey } from '../../common/catalog-offers';
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
import {
  filterPackagesAvailableToStudent,
  resolveNextPackageForStudent,
} from '../content/content-assignment';
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

  async listEnrollmentPackages(user: RequestUser, studentId: string) {
    const institutionId = requireInstitutionId(user);
    if (!studentId?.trim()) {
      throw new BadRequestException('Query parameter "studentId" is required');
    }

    const [student, grantedPackageIds] = await Promise.all([
      this.prisma.studentProfile.findUnique({
        where: { id: studentId.trim() },
        select: { id: true, institutionId: true },
      }),
      this.mockSets.listGrantedPackageIds(institutionId),
    ]);

    if (!student || student.institutionId !== institutionId) {
      throw new NotFoundException('Student not found for this institution');
    }

    const grantedPackages =
      grantedPackageIds.length > 0
        ? await this.prisma.mockTestPackage.findMany({
            where: { id: { in: grantedPackageIds }, isActive: true },
          })
        : [];

    const availableGranted = await filterPackagesAvailableToStudent(
      this.prisma,
      student.id,
      grantedPackages,
    );

    const platform = availableGranted
      .map((p) => {
        const skills = packageExamSkills(p.skills);
        return {
          id: p.id,
          title: p.title,
          packageKind: p.packageKind,
          mockNumber: p.mockNumber,
          skills: skills.map((s) => s.toLowerCase()),
          needsWriting: skills.includes(ExamSkill.WRITING),
          needsSpeaking: skills.includes(ExamSkill.SPEAKING),
        };
      })
      .sort((a, b) => a.title.localeCompare(b.title));

    const own = await this.resolveNextPackagesForStudent(
      student.id,
      institutionId,
    );

    return {
      studentId: student.id,
      platform,
      own: own.map((p) => ({ ...p, costsCredit: false })),
    };
  }

  private async resolveNextPackagesForStudent(
    studentId: string,
    institutionId: string | null,
  ) {
    const activePackages = await this.prisma.mockTestPackage.findMany({
      where: { isActive: true, institutionId },
      select: { packageKind: true, examType: true },
    });

    const seen = new Map<string, { packageKind: string; examType: ExamType }>();
    for (const pkg of activePackages) {
      const key = groupKey(pkg.packageKind, pkg.examType);
      if (!seen.has(key)) {
        seen.set(key, {
          packageKind: pkg.packageKind,
          examType: pkg.examType,
        });
      }
    }

    const options: {
      id: string;
      title: string;
      packageKind: string;
      mockNumber: number;
      skills: string[];
      needsWriting: boolean;
      needsSpeaking: boolean;
    }[] = [];

    for (const group of seen.values()) {
      const resolved = await resolveNextPackageForStudent(
        this.prisma,
        studentId,
        { ...group, institutionId },
      );
      if (resolved) {
        const skills = packageExamSkills(resolved.skills);
        options.push({
          id: resolved.id,
          title: resolved.title,
          packageKind: resolved.packageKind,
          mockNumber: resolved.mockNumber,
          skills: skills.map((s) => s.toLowerCase()),
          needsWriting: skills.includes(ExamSkill.WRITING),
          needsSpeaking: skills.includes(ExamSkill.SPEAKING),
        });
      }
    }

    return options.sort((a, b) => a.title.localeCompare(b.title));
  }

  async suggestNextPackage(user: RequestUser) {
    const institutionId = requireInstitutionId(user);
    const skills = [...DEFAULT_SKILLS];
    const packageKind = derivePackageKind(skills);
    const examType = ExamType.ACADEMIC;
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

    for (const entry of pool) {
      const test = byId.get(entry.testIds[0]!);
      if (!test) throw new BadRequestException('Selected test not found');
      if (test.institutionId !== institutionId) {
        throw new BadRequestException(
          'Only your centre\'s published tests can be linked to this package',
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
