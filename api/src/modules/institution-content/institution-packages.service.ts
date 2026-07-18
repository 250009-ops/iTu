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
import {
  derivePackageKind,
  formatMockNumber,
  packageKindLabel,
  SKILL_TO_POOL_KEY,
  SKILL_TO_TEST_FIELD,
} from '../../common/package-kind';
import { requireInstitutionId } from '../../common/institution/institution-scope';
import { RequestUser } from '../../common/types/request-user';
import {
  assertPackageScopeMatch,
  packageScopeKey,
  scopeWhere,
} from '../content/content-scope';
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

  async listEnrollmentPackages(user: RequestUser) {
    const institutionId = requireInstitutionId(user);
    const [platform, own] = await Promise.all([
      this.prisma.mockTestPackage.findMany({
        where: { institutionId: null, isActive: true },
        orderBy: { title: 'asc' },
        select: { id: true, title: true, packageKind: true, mockNumber: true },
      }),
      this.prisma.mockTestPackage.findMany({
        where: { institutionId, isActive: true },
        orderBy: { title: 'asc' },
        select: { id: true, title: true, packageKind: true, mockNumber: true },
      }),
    ]);
    return {
      platform: platform.map((p) => ({
        id: p.id,
        title: p.title,
        mockLabel: formatMockNumber(p.packageKind, p.mockNumber),
        costsCredit: true,
      })),
      own: own.map((p) => ({
        id: p.id,
        title: p.title,
        mockLabel: formatMockNumber(p.packageKind, p.mockNumber),
        costsCredit: false,
      })),
    };
  }

  async createPackage(
    user: RequestUser,
    dto: {
      title: string;
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
    const mockNumber = await this.nextMockNumber(institutionId, packageKind);
    const slug = await this.resolveSlug(institution.slug, dto.title);

    const created = await this.prisma.mockTestPackage.create({
      data: {
        slug,
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        price: 0,
        currency: 'UZS',
        examType: dto.examType ?? ExamType.ACADEMIC,
        packageKind,
        mockNumber,
        scopeKey: packageScopeKey(institutionId),
        institutionId,
        skills,
        included: [] as Prisma.InputJsonValue,
        rules: [] as Prisma.InputJsonValue,
        isActive: false,
      },
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
    const latest = await this.prisma.mockTestPackage.findFirst({
      where: { institutionId, packageKind },
      orderBy: { mockNumber: 'desc' },
      select: { mockNumber: true },
    });
    return (latest?.mockNumber ?? 0) + 1;
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
