import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ContentTestStatus,
  ContentTestType,
  ExamSkill,
  ExamType,
  InstitutionMockSetGrantSource,
  Prisma,
} from '@prisma/client';
import {
  buildTabId,
  buildTabLabel,
  groupKey,
  sortOfferGroups,
  type OfferGroup,
} from '../../common/catalog-offers';
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
import { getPackageContentTemplate } from '../../common/package-templates';
import {
  queryNextMockNumber,
  withUniqueRetry,
} from '../../common/id-allocation';
import { findContentTestPackageAssignments } from '../content/content-package-assignments';
import { packageExamSkills } from '../content/package-skills';
import { PrismaService } from '../../prisma/prisma.service';

const SECTION_KINDS = ['listening', 'reading', 'writing'] as const;
type SectionKind = (typeof SECTION_KINDS)[number];

const SKILL_FOR_KIND: Record<SectionKind, ExamSkill> = {
  listening: ExamSkill.LISTENING,
  reading: ExamSkill.READING,
  writing: ExamSkill.WRITING,
};

const TYPE_FOR_KIND: Record<SectionKind, ContentTestType> = {
  listening: ContentTestType.LISTENING,
  reading: ContentTestType.READING,
  writing: ContentTestType.WRITING,
};

const SECTION_SKILL_META: Record<
  SectionKind,
  {
    name: string;
    badge: string;
    includedBadge: string;
    color: 'sky' | 'emerald' | 'violet';
  }
> = {
  listening: {
    name: 'Listening',
    badge: 'Not included',
    includedBadge: 'Auto scored',
    color: 'sky',
  },
  reading: {
    name: 'Reading',
    badge: 'Not included',
    includedBadge: 'Auto scored',
    color: 'emerald',
  },
  writing: {
    name: 'Writing',
    badge: 'Not included',
    includedBadge: 'Human graded',
    color: 'violet',
  },
};

export type MockSetContentOptionPackage = {
  id: string;
  title: string;
  packageKind: string;
  mockNumber: number;
  mockLabel: string;
  isAssigned: boolean;
  assignedSetId: string | null;
  assignedSetTitle: string | null;
};

export type MockSetContentOptionTest = {
  id: string;
  code: string;
  title: string;
  type: string;
  isAssigned: boolean;
  assignedSetId: string | null;
  assignedSetTitle: string | null;
  assignedPackageId: string | null;
  assignedPackageTitle: string | null;
};

export type MockSetSelectionInput = {
  packageIds?: string[];
  listeningIds?: string[];
  readingIds?: string[];
  writingIds?: string[];
};

@Injectable()
export class InstitutionMockSetsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async listSets() {
    const sets = await this.prisma.institutionMockSet.findMany({
      orderBy: [{ isActive: 'desc' }, { updatedAt: 'desc' }],
      include: {
        _count: { select: { grants: true } },
        items: {
          orderBy: { sortOrder: 'asc' },
          include: {
            package: {
              select: { packageKind: true, mockNumber: true, title: true },
            },
          },
        },
      },
    });

    return sets.map((set) => ({
      id: set.id,
      slug: set.slug,
      title: set.title,
      description: set.description,
      listPrice: set.listPrice,
      isListed: set.isListed,
      isActive: set.isActive,
      grantCount: set._count.grants,
      contentSummary: this.formatContentSummary(set.items),
      contentLocked: set._count.grants > 0,
      updatedAt: set.updatedAt,
    }));
  }

  async getSet(id: string) {
    const set = await this.prisma.institutionMockSet.findUnique({
      where: { id },
      include: {
        _count: { select: { grants: true } },
        items: { orderBy: { sortOrder: 'asc' }, select: { packageId: true } },
      },
    });
    if (!set) throw new NotFoundException('Institution mock set not found');

    return {
      id: set.id,
      slug: set.slug,
      title: set.title,
      description: set.description,
      listPrice: set.listPrice,
      isListed: set.isListed,
      isActive: set.isActive,
      packageIds: set.items.map((i) => i.packageId),
      grantCount: set._count.grants,
      contentLocked: set._count.grants > 0,
    };
  }

  async listContentOptions(excludeSetId?: string) {
    const [packages, tests, setItems] = await Promise.all([
      this.prisma.mockTestPackage.findMany({
        where: {
          institutionId: null,
          isActive: true,
          packageKind: { in: [...SECTION_KINDS] },
        },
        orderBy: [{ packageKind: 'asc' }, { mockNumber: 'asc' }],
        select: {
          id: true,
          title: true,
          packageKind: true,
          mockNumber: true,
        },
      }),
      this.prisma.contentTest.findMany({
        where: {
          institutionId: null,
          status: ContentTestStatus.PUBLISHED,
          type: { in: [ContentTestType.LISTENING, ContentTestType.READING, ContentTestType.WRITING] },
        },
        orderBy: [{ type: 'asc' }, { code: 'asc' }],
        select: { id: true, code: true, title: true, type: true },
      }),
      this.prisma.institutionMockSetItem.findMany({
        include: {
          set: { select: { id: true, title: true } },
          package: {
            select: {
              id: true,
              listeningTestId: true,
              readingTestId: true,
              writingTestId: true,
              contentPool: { select: { testId: true } },
            },
          },
        },
      }),
    ]);

    const packageToSet = new Map<
      string,
      { setId: string; setTitle: string; testIds: Set<string> }
    >();
    for (const item of setItems) {
      if (excludeSetId && item.setId === excludeSetId) continue;
      packageToSet.set(item.packageId, {
        setId: item.setId,
        setTitle: item.set.title,
        testIds: this.collectPackageTestIds(item.package),
      });
    }

    const testToSet = new Map<string, { setId: string; setTitle: string }>();
    for (const meta of packageToSet.values()) {
      for (const testId of meta.testIds) {
        testToSet.set(testId, { setId: meta.setId, setTitle: meta.setTitle });
      }
    }

    const assignments = await findContentTestPackageAssignments(
      this.prisma,
      tests.map((t) => t.id),
    );
    const assignmentByTestId = new Map(
      assignments.map((a) => [a.testId, a]),
    );

    const packageOptions: Record<SectionKind, MockSetContentOptionPackage[]> = {
      listening: [],
      reading: [],
      writing: [],
    };

    for (const pkg of packages) {
      const kind = pkg.packageKind as SectionKind;
      if (!SECTION_KINDS.includes(kind)) continue;
      const assigned = packageToSet.get(pkg.id);
      packageOptions[kind].push({
        id: pkg.id,
        title: pkg.title,
        packageKind: pkg.packageKind,
        mockNumber: pkg.mockNumber,
        mockLabel: formatMockNumber(pkg.packageKind, pkg.mockNumber),
        isAssigned: Boolean(assigned),
        assignedSetId: assigned?.setId ?? null,
        assignedSetTitle: assigned?.setTitle ?? null,
      });
    }

    const testOptions: Record<SectionKind, MockSetContentOptionTest[]> = {
      listening: [],
      reading: [],
      writing: [],
    };

    for (const test of tests) {
      const kind = test.type.toLowerCase() as SectionKind;
      if (!SECTION_KINDS.includes(kind)) continue;
      const assigned = testToSet.get(test.id);
      const link = assignmentByTestId.get(test.id);
      testOptions[kind].push({
        id: test.id,
        code: test.code,
        title: test.title,
        type: test.type.toLowerCase(),
        isAssigned: Boolean(assigned),
        assignedSetId: assigned?.setId ?? null,
        assignedSetTitle: assigned?.setTitle ?? null,
        assignedPackageId: link?.packageId ?? null,
        assignedPackageTitle: link?.packageTitle ?? null,
      });
    }

    return { packages: packageOptions, tests: testOptions };
  }

  async createSet(
    data: {
      slug: string;
      title: string;
      description?: string;
      listPrice?: number;
      isListed?: boolean;
      isActive?: boolean;
    },
    selection: MockSetSelectionInput,
    actorId: string,
  ) {
    const slug = data.slug.trim();
    const existing = await this.prisma.institutionMockSet.findUnique({
      where: { slug },
    });
    if (existing) {
      throw new ConflictException('A set with this slug already exists');
    }

    const isListed = data.isListed ?? true;
    const listPrice = data.listPrice ?? 0;
    this.assertValidListingPrice(isListed, listPrice);

    const packageIds = await this.resolveSelectionToPackageIds(selection);

    const created = await this.prisma.institutionMockSet.create({
      data: {
        slug,
        title: data.title.trim(),
        description: data.description?.trim() || null,
        listPrice,
        isListed,
        isActive: data.isActive ?? true,
      },
    });

    await this.syncSetItems(created.id, packageIds);

    await this.audit.log({
      userId: actorId,
      action: AuditAction.ADMIN_PACKAGE_CREATE,
      entity: 'institution_mock_set',
      entityId: created.id,
      metadata: { title: created.title, packageCount: packageIds.length },
    });

    return this.getSet(created.id);
  }

  async updateSet(
    id: string,
    data: {
      slug?: string;
      title?: string;
      description?: string | null;
      listPrice?: number;
      isListed?: boolean;
      isActive?: boolean;
    },
    selection: MockSetSelectionInput | undefined,
    actorId: string,
  ) {
    const set = await this.prisma.institutionMockSet.findUnique({
      where: { id },
      include: { _count: { select: { grants: true } } },
    });
    if (!set) throw new NotFoundException('Institution mock set not found');

    if (selection && set._count.grants > 0) {
      throw new BadRequestException(
        'Set content cannot be changed after it has been granted to a centre',
      );
    }

    const nextIsListed = data.isListed ?? set.isListed;
    const nextListPrice = data.listPrice ?? set.listPrice;
    this.assertValidListingPrice(nextIsListed, nextListPrice);

    if (data.slug && data.slug.trim() !== set.slug) {
      const clash = await this.prisma.institutionMockSet.findUnique({
        where: { slug: data.slug.trim() },
      });
      if (clash) throw new ConflictException('A set with this slug already exists');
    }

    await this.prisma.institutionMockSet.update({
      where: { id },
      data: {
        slug: data.slug?.trim(),
        title: data.title?.trim(),
        description: data.description === undefined ? undefined : data.description,
        listPrice: data.listPrice,
        isListed: data.isListed,
        isActive: data.isActive,
      },
    });

    if (selection) {
      const packageIds = await this.resolveSelectionToPackageIds(selection, id);
      await this.syncSetItems(id, packageIds);
    }

    await this.audit.log({
      userId: actorId,
      action: AuditAction.ADMIN_PACKAGE_UPDATE,
      entity: 'institution_mock_set',
      entityId: id,
      metadata: { title: data.title ?? set.title },
    });

    return this.getSet(id);
  }

  async listAvailableSetsForGrant(institutionId: string) {
    const institution = await this.prisma.institution.findUnique({
      where: { id: institutionId },
      select: { id: true },
    });
    if (!institution) throw new NotFoundException('Institution not found');

    const grantedSetIds = (
      await this.prisma.institutionMockSetGrant.findMany({
        where: { institutionId },
        select: { setId: true },
      })
    ).map((g) => g.setId);

    const sets = await this.prisma.institutionMockSet.findMany({
      where: {
        isActive: true,
        id: { notIn: grantedSetIds },
      },
      orderBy: { title: 'asc' },
      include: {
        items: {
          include: {
            package: { select: { packageKind: true } },
          },
        },
      },
    });

    return sets.map((set) => ({
      id: set.id,
      slug: set.slug,
      title: set.title,
      description: set.description,
      contentSummary: this.formatContentSummary(set.items),
    }));
  }

  async listGrants(institutionId: string) {
    const institution = await this.prisma.institution.findUnique({
      where: { id: institutionId },
      select: { id: true },
    });
    if (!institution) throw new NotFoundException('Institution not found');

    const grants = await this.prisma.institutionMockSetGrant.findMany({
      where: { institutionId },
      orderBy: { createdAt: 'desc' },
      include: {
        set: {
          select: {
            id: true,
            slug: true,
            title: true,
            isActive: true,
            items: {
              include: {
                package: { select: { packageKind: true } },
              },
            },
          },
        },
      },
    });

    return grants.map((grant) => ({
      id: grant.id,
      setId: grant.setId,
      setTitle: grant.set.title,
      setSlug: grant.set.slug,
      setActive: grant.set.isActive,
      contentSummary: this.formatContentSummary(grant.set.items),
      note: grant.note,
      createdAt: grant.createdAt,
    }));
  }

  async grantSet(
    institutionId: string,
    setId: string,
    actorId: string,
    note?: string,
  ) {
    const [institution, set] = await Promise.all([
      this.prisma.institution.findUnique({ where: { id: institutionId } }),
      this.prisma.institutionMockSet.findUnique({ where: { id: setId } }),
    ]);
    if (!institution) throw new NotFoundException('Institution not found');
    if (!set) throw new NotFoundException('Institution mock set not found');
    if (!set.isActive) {
      throw new BadRequestException('Cannot grant an inactive set');
    }

    const existing = await this.prisma.institutionMockSetGrant.findUnique({
      where: { institutionId_setId: { institutionId, setId } },
    });
    if (existing) {
      throw new ConflictException('This set has already been granted to this centre');
    }

    const grant = await this.prisma.institutionMockSetGrant.create({
      data: {
        institutionId,
        setId,
        grantedById: actorId,
        source: InstitutionMockSetGrantSource.ADMIN_GRANT,
        note: note?.trim() || null,
      },
    });

    await this.audit.log({
      userId: actorId,
      action: AuditAction.ADMIN_ENROLLMENT_GRANT,
      entity: 'institution_mock_set_grant',
      entityId: grant.id,
      metadata: { institutionId, setId, setTitle: set.title },
    });

    return this.listGrants(institutionId);
  }

  async revokeGrant(
    institutionId: string,
    setId: string,
    actorId: string,
  ) {
    const grant = await this.prisma.institutionMockSetGrant.findUnique({
      where: { institutionId_setId: { institutionId, setId } },
    });
    if (!grant) throw new NotFoundException('Grant not found');

    const activeEnrollments = await this.prisma.enrollment.count({
      where: {
        institutionId,
        status: { in: ['ENROLLED', 'IN_PROGRESS', 'AWAITING_RESULTS'] },
        package: {
          mockSetItem: { setId },
        },
      },
    });
    if (activeEnrollments > 0) {
      throw new BadRequestException(
        'Cannot revoke this set while students have active enrollments from it',
      );
    }

    await this.prisma.institutionMockSetGrant.delete({
      where: { id: grant.id },
    });

    await this.audit.log({
      userId: actorId,
      action: AuditAction.ADMIN_ENROLLMENT_GRANT_REVOKE,
      entity: 'institution_mock_set_grant',
      entityId: grant.id,
      metadata: { institutionId, setId },
    });

    return this.listGrants(institutionId);
  }

  async hasGrantedSetPackage(institutionId: string, packageId: string) {
    const item = await this.prisma.institutionMockSetItem.findFirst({
      where: {
        packageId,
        set: {
          grants: { some: { institutionId } },
          isActive: true,
        },
      },
    });
    return Boolean(item);
  }

  async listGrantedPackageIds(institutionId: string): Promise<string[]> {
    const items = await this.prisma.institutionMockSetItem.findMany({
      where: {
        set: {
          isActive: true,
          grants: { some: { institutionId } },
        },
      },
      select: { packageId: true },
    });
    return items.map((i) => i.packageId);
  }

  async listMocksForInstitution(institutionId: string, currency = 'UZS') {
    const grants = await this.prisma.institutionMockSetGrant.findMany({
      where: { institutionId },
      include: {
        set: {
          select: { id: true, title: true, isActive: true },
        },
      },
    });

    const grantBySetId = new Map(grants.map((g) => [g.setId, g]));

    const activeGrantSetIds = grants
      .filter((g) => g.set.isActive)
      .map((g) => g.setId);

    if (activeGrantSetIds.length === 0) {
      const preview = await this.buildMocksPreview(currency);
      return { tabs: [], packages: [], grants: [], preview };
    }

    const items = await this.prisma.institutionMockSetItem.findMany({
      where: { setId: { in: activeGrantSetIds } },
      include: {
        set: { select: { id: true, title: true } },
        package: true,
      },
      orderBy: [{ setId: 'asc' }, { sortOrder: 'asc' }],
    });

    const grantMeta = grants.map((g) => ({
      setId: g.setId,
      setTitle: g.set.title,
      grantedAt: g.createdAt,
      source: g.source,
    }));

    const packages = items
      .filter((item) => item.package.isActive)
      .map((item) => {
        const grant = grantBySetId.get(item.set.id);
        return {
          ...this.toCatalogPackage(item.package),
          grantSetId: item.set.id,
          grantSetTitle: item.set.title,
          grantSource: grant?.source ?? InstitutionMockSetGrantSource.ADMIN_GRANT,
        };
      });

    const seen = new Map<string, OfferGroup>();
    for (const pkg of packages) {
      const key = groupKey(pkg.packageKind, pkg.examType as ExamType);
      if (!seen.has(key)) {
        seen.set(key, {
          packageKind: pkg.packageKind,
          examType: pkg.examType as ExamType,
        });
      }
    }

    const tabs = sortOfferGroups([...seen.values()]).map((group) => ({
      tabId: buildTabId(group.packageKind, group.examType),
      label: buildTabLabel(group.packageKind, group.examType),
      packageKind: group.packageKind,
      examType: group.examType,
    }));

    return { tabs, packages, grants: grantMeta, preview: null };
  }

  async listShopForInstitution(institutionId: string, currency: string) {
    const owned = await this.prisma.institutionMockSetGrant.findMany({
      where: { institutionId },
      select: { setId: true },
    });
    const ownedSetIds = new Set(owned.map((g) => g.setId));

    const sets = await this.prisma.institutionMockSet.findMany({
      where: {
        isActive: true,
        isListed: true,
        listPrice: { gt: 0 },
        id: { notIn: [...ownedSetIds] },
      },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
          include: { package: true },
        },
      },
      orderBy: { title: 'asc' },
    });

    return {
      sets: sets.map((set) => {
        const purchase = this.evaluateSetPurchase(set, ownedSetIds);
        const offer = this.buildSetShopOffer(set, currency);
        return {
          ...offer,
          canPurchase: purchase.canPurchase,
          disabledReason: purchase.disabledReason,
        };
      }),
    };
  }

  async getSetForCheckout(setId: string, institutionId: string) {
    const set = await this.prisma.institutionMockSet.findUnique({
      where: { id: setId },
    });
    if (!set || !set.isActive || !set.isListed || set.listPrice <= 0) {
      throw new NotFoundException('Mock set not available for purchase');
    }

    const existing = await this.prisma.institutionMockSetGrant.findUnique({
      where: { institutionId_setId: { institutionId, setId } },
    });
    if (existing) {
      throw new ConflictException('Your centre already owns this mock set');
    }

    return set;
  }

  async grantSetFromPurchase(
    institutionId: string,
    setId: string,
    orderId: string,
  ) {
    const byOrder = await this.prisma.institutionMockSetGrant.findUnique({
      where: { orderId },
    });
    if (byOrder) return byOrder;

    const existing = await this.prisma.institutionMockSetGrant.findUnique({
      where: { institutionId_setId: { institutionId, setId } },
    });
    if (existing) return existing;

    const set = await this.prisma.institutionMockSet.findUnique({
      where: { id: setId },
    });
    if (!set || !set.isActive) {
      throw new NotFoundException('Institution mock set not found');
    }

    return this.prisma.institutionMockSetGrant.create({
      data: {
        institutionId,
        setId,
        orderId,
        source: InstitutionMockSetGrantSource.PURCHASE,
        note: 'Purchased via institution shop',
      },
    });
  }

  private evaluateSetPurchase(
    set: {
      id: string;
      isListed: boolean;
      listPrice: number;
      items: { package: { isActive: boolean } }[];
    },
    ownedSetIds: Set<string>,
  ): { canPurchase: boolean; disabledReason?: string } {
    if (ownedSetIds.has(set.id)) {
      return { canPurchase: false, disabledReason: 'You already own this set' };
    }
    if (!set.isListed) {
      return { canPurchase: false, disabledReason: 'Not listed for sale yet' };
    }
    if (set.listPrice <= 0) {
      return { canPurchase: false, disabledReason: 'Price not configured' };
    }
    const hasActiveItems = set.items.some((item) => item.package.isActive);
    if (!hasActiveItems) {
      return { canPurchase: false, disabledReason: 'Set content not ready' };
    }
    return { canPurchase: true };
  }

  private async buildMocksPreview(currency: string) {
    const showcase = await this.findShowcaseSet();
    if (showcase) {
      return this.buildPreviewFromSet(showcase, currency);
    }
    return null;
  }

  private async findShowcaseSet() {
    const listed = await this.prisma.institutionMockSet.findFirst({
      where: {
        isActive: true,
        isListed: true,
        items: { some: { package: { isActive: true } } },
      },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
          include: { package: true },
        },
      },
      orderBy: { title: 'asc' },
    });
    if (listed) return listed;

    return this.prisma.institutionMockSet.findFirst({
      where: {
        isActive: true,
        items: { some: { package: { isActive: true } } },
      },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
          include: { package: true },
        },
      },
      orderBy: { title: 'asc' },
    });
  }

  private buildPreviewFromSet(
    set: {
      id: string;
      title: string;
      items: {
        package: {
          id: string;
          slug: string;
          title: string;
          description: string | null;
          price: number;
          currency: string;
          examType: ExamType;
          packageKind: string;
          mockNumber: number;
          mostPopular: boolean;
          rating: number | null;
          reviewCount: number;
          skills: unknown;
          included: unknown;
          rules: unknown;
          isActive: boolean;
        };
      }[];
    },
    _currency: string,
  ) {
    const packages = set.items
      .filter((item) => item.package.isActive)
      .map((item) => ({
        ...this.toCatalogPackage(item.package),
        grantSetId: set.id,
        grantSetTitle: set.title,
        grantSource: InstitutionMockSetGrantSource.ADMIN_GRANT,
      }));

    const tabs = this.buildTabsFromPackages(packages);

    return {
      tabs,
      packages,
      showcaseSetTitle: set.title,
    };
  }

  private buildTabsFromPackages(
    packages: { packageKind: string; examType: ExamType | string }[],
  ) {
    const seen = new Map<string, OfferGroup>();
    for (const pkg of packages) {
      const key = groupKey(pkg.packageKind, pkg.examType as ExamType);
      if (!seen.has(key)) {
        seen.set(key, {
          packageKind: pkg.packageKind,
          examType: pkg.examType as ExamType,
        });
      }
    }

    return sortOfferGroups([...seen.values()]).map((group) => ({
      tabId: buildTabId(group.packageKind, group.examType),
      label: buildTabLabel(group.packageKind, group.examType),
      packageKind: group.packageKind,
      examType: group.examType,
    }));
  }

  private assertValidListingPrice(isListed: boolean, listPrice: number) {
    if (isListed && listPrice <= 0) {
      throw new BadRequestException(
        'List price must be greater than zero when the set is listed for sale',
      );
    }
  }

  private buildSetShopOffer(
    set: {
      id: string;
      slug: string;
      title: string;
      description: string | null;
      listPrice: number;
      items: { package: {
        id: string;
        slug: string;
        title: string;
        description: string | null;
        price: number;
        currency: string;
        examType: ExamType;
        packageKind: string;
        mockNumber: number;
        mostPopular: boolean;
        rating: number | null;
        reviewCount: number;
        skills: unknown;
        included: unknown;
        rules: unknown;
        isActive: boolean;
      } }[];
    },
    currency: string,
  ) {
    const activePackages = set.items
      .map((item) => item.package)
      .filter((pkg) => pkg.isActive);

    const packagesForProduct =
      activePackages.length > 0
        ? activePackages
        : set.items.map((item) => item.package);

    const product = this.buildSetShopProduct(
      set,
      packagesForProduct.map((pkg) => ({
        packageKind: pkg.packageKind,
        examType: pkg.examType,
        title: pkg.title,
        description: pkg.description,
        included: pkg.included,
        rules: pkg.rules,
      })),
      currency,
    );

    return {
      setId: set.id,
      slug: set.slug,
      title: set.title,
      description: set.description,
      listPrice: set.listPrice,
      currency,
      contentSummary: this.formatContentSummary(
        activePackages.map((pkg) => ({ package: { packageKind: pkg.packageKind } })),
      ),
      product,
    };
  }

  private buildSetShopProduct(
    set: {
      id: string;
      slug: string;
      title: string;
      description: string | null;
      listPrice: number;
    },
    packages: {
      packageKind: string;
      examType: ExamType;
      title?: string;
      description?: string | null;
      included: unknown;
      rules: unknown;
    }[],
    currency: string,
  ) {
    const sectionOrder = ['listening', 'reading', 'writing'] as const;
    const countsByKind: Record<SectionKind, number> = {
      listening: 0,
      reading: 0,
      writing: 0,
    };
    const packagesByKind = new Map<
      SectionKind,
      (typeof packages)[number]
    >();

    for (const pkg of packages) {
      const kind = pkg.packageKind as SectionKind;
      if (!SECTION_KINDS.includes(kind)) continue;
      countsByKind[kind] += 1;
      packagesByKind.set(kind, pkg);
    }

    const includedCount = sectionOrder.filter(
      (kind) => countsByKind[kind] > 0,
    ).length;

    const skills = sectionOrder.map((kind) => {
      const count = countsByKind[kind];
      const meta = SECTION_SKILL_META[kind];
      const pkg = packagesByKind.get(kind);
      const detail =
        count === 0
          ? '0 mocks'
          : pkg?.description?.trim() ||
            pkg?.title?.trim() ||
            `${count} mock${count === 1 ? '' : 's'}`;

      return {
        id: kind,
        name: meta.name,
        detail,
        badge: count === 0 ? meta.badge : meta.includedBadge,
        color: meta.color,
      };
    });

    const included = this.mergeStringLists(
      packages.flatMap((p) => this.normalizeStringList(p.included)),
    );
    const rules = this.mergeStringLists(
      packages.flatMap((p) => this.normalizeStringList(p.rules)),
    );

    const examType = packages[0]?.examType ?? ExamType.ACADEMIC;

    return {
      id: set.id,
      slug: set.slug,
      title: set.title,
      description:
        set.description?.trim() ||
        (includedCount > 0
          ? `B2B mock set with ${includedCount} section mock${includedCount === 1 ? '' : 's'} for your centre.`
          : 'Set content not configured yet.'),
      examType: examType === ExamType.GENERAL_TRAINING ? 'General Training' : 'Academic',
      delivery: 'Computer-Based',
      bookCta: 'Buy mock set',
      price: set.listPrice,
      currency,
      mostPopular: false,
      rating: null,
      reviewCount: 0,
      skills,
      included,
      rules,
      highlights: [
        {
          icon: 'check',
          label: `${includedCount} section mock${includedCount === 1 ? '' : 's'} included`,
        },
        { icon: 'user', label: 'Unlimited student enrollments' },
        { icon: 'globe', label: 'Computer-delivered mock format' },
      ],
    };
  }

  private normalizeStringList(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is string => typeof item === 'string');
  }

  private mergeStringLists(...lists: string[][]): string[] {
    const seen = new Set<string>();
    const merged: string[] = [];
    for (const list of lists) {
      for (const item of list) {
        const trimmed = item.trim();
        if (!trimmed || seen.has(trimmed)) continue;
        seen.add(trimmed);
        merged.push(trimmed);
      }
    }
    return merged;
  }

  private toCatalogPackage(pkg: {
    id: string;
    slug: string;
    title: string;
    description: string | null;
    price: number;
    currency: string;
    examType: ExamType;
    packageKind: string;
    mockNumber: number;
    mostPopular: boolean;
    rating: number | null;
    reviewCount: number;
    skills: unknown;
    included: unknown;
    rules: unknown;
  }) {
    return {
      id: pkg.id,
      slug: pkg.slug,
      title: pkg.title,
      description: pkg.description,
      price: pkg.price,
      currency: pkg.currency,
      examType: pkg.examType,
      packageKind: pkg.packageKind,
      mockNumber: pkg.mockNumber,
      mostPopular: pkg.mostPopular,
      rating: pkg.rating,
      reviewCount: pkg.reviewCount,
      skills: pkg.skills,
      included: pkg.included,
      rules: pkg.rules,
    };
  }

  private formatContentSummary(
    items: { package: { packageKind: string } }[],
  ): string {
    const counts: Record<SectionKind, number> = {
      listening: 0,
      reading: 0,
      writing: 0,
    };
    for (const item of items) {
      const kind = item.package.packageKind as SectionKind;
      if (SECTION_KINDS.includes(kind)) {
        counts[kind] += 1;
      }
    }
    return SECTION_KINDS.map(
      (kind) => `${counts[kind]} ${packageKindLabel(kind)}`,
    ).join(' · ');
  }

  private collectPackageTestIds(pkg: {
    listeningTestId: string | null;
    readingTestId: string | null;
    writingTestId: string | null;
    contentPool: { testId: string }[];
  }): Set<string> {
    const ids = new Set<string>();
    for (const row of pkg.contentPool) ids.add(row.testId);
    if (pkg.listeningTestId) ids.add(pkg.listeningTestId);
    if (pkg.readingTestId) ids.add(pkg.readingTestId);
    if (pkg.writingTestId) ids.add(pkg.writingTestId);
    return ids;
  }

  private async resolveSelectionToPackageIds(
    selection: MockSetSelectionInput,
    excludeSetId?: string,
  ): Promise<string[]> {
    const ids = new Set<string>();

    if (selection.packageIds?.length) {
      for (const id of selection.packageIds) ids.add(id);
    }

    const testSelections: [SectionKind, string[] | undefined][] = [
      ['listening', selection.listeningIds],
      ['reading', selection.readingIds],
      ['writing', selection.writingIds],
    ];

    for (const [kind, testIds] of testSelections) {
      if (!testIds?.length) continue;
      for (const testId of testIds) {
        const packageId = await this.ensurePackageForTest(testId, kind);
        ids.add(packageId);
      }
    }

    const packageIds = [...ids];
    if (packageIds.length === 0) {
      throw new BadRequestException('Set must include at least one mock package');
    }

    await this.assertPackagesValidForSet(packageIds, excludeSetId);
    return packageIds;
  }

  private async ensurePackageForTest(
    testId: string,
    kind: SectionKind,
  ): Promise<string> {
    const test = await this.prisma.contentTest.findUnique({
      where: { id: testId },
    });
    if (!test || test.institutionId != null) {
      throw new BadRequestException('Selected test not found');
    }
    if (test.status !== ContentTestStatus.PUBLISHED) {
      throw new BadRequestException(`Test ${test.code} is not published`);
    }
    if (test.type !== TYPE_FOR_KIND[kind]) {
      throw new BadRequestException(`Test ${test.code} is not a ${kind} test`);
    }

    const existingPool = await this.prisma.packageContentTest.findFirst({
      where: {
        testId,
        skill: SKILL_FOR_KIND[kind],
        package: { institutionId: null, packageKind: kind },
      },
      select: { packageId: true },
    });
    if (existingPool) return existingPool.packageId;

    const fkField = SKILL_TO_TEST_FIELD[SKILL_FOR_KIND[kind]];
    const existingFk = await this.prisma.mockTestPackage.findFirst({
      where: {
        institutionId: null,
        packageKind: kind,
        [fkField]: testId,
      },
      select: { id: true },
    });
    if (existingFk) return existingFk.id;

    const skills = [kind];
    const packageKind = derivePackageKind(skills);

    return withUniqueRetry(async () => {
      const mockNumber = await queryNextMockNumber(this.prisma, {
        scopeKey: 'platform',
        packageKind,
        institutionId: null,
      });
      const template = getPackageContentTemplate(packageKind, ExamType.ACADEMIC);
      const title = suggestPackageTitle(ExamType.ACADEMIC, packageKind, mockNumber);
      const slug = await this.resolvePackageSlug(title);

      const created = await this.prisma.mockTestPackage.create({
        data: {
          slug,
          title,
          description: template.description,
          price: 0,
          currency: 'UZS',
          examType: ExamType.ACADEMIC,
          packageKind,
          mockNumber,
          scopeKey: 'platform',
          institutionId: null,
          skills: skills as Prisma.InputJsonValue,
          included: template.included as Prisma.InputJsonValue,
          rules: template.rules as Prisma.InputJsonValue,
          isActive: true,
          [fkField]: testId,
        },
      });

      await this.prisma.packageContentTest.create({
        data: {
          packageId: created.id,
          testId,
          skill: SKILL_FOR_KIND[kind],
        },
      });

      return created.id;
    });
  }

  private async resolvePackageSlug(title: string) {
    const base = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48);
    let candidate = base || 'inst-set-mock';
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

  private async assertPackagesValidForSet(
    packageIds: string[],
    excludeSetId?: string,
  ) {
    const packages = await this.prisma.mockTestPackage.findMany({
      where: { id: { in: packageIds } },
      include: {
        mockSetItem: { include: { set: { select: { id: true, title: true } } } },
        contentPool: { select: { testId: true, skill: true } },
      },
    });

    if (packages.length !== packageIds.length) {
      throw new BadRequestException('One or more packages were not found');
    }

    for (const pkg of packages) {
      if (pkg.institutionId != null) {
        throw new BadRequestException(
          `Package "${pkg.title}" is not a platform package`,
        );
      }
      if (!SECTION_KINDS.includes(pkg.packageKind as SectionKind)) {
        throw new BadRequestException(
          `Package "${pkg.title}" must be a listening, reading, or writing section mock`,
        );
      }
      if (
        pkg.mockSetItem &&
        pkg.mockSetItem.setId !== excludeSetId
      ) {
        throw new BadRequestException(
          `Package "${pkg.title}" is already in set "${pkg.mockSetItem.set.title}"`,
        );
      }
    }

    const otherSetItems = await this.prisma.institutionMockSetItem.findMany({
      where: {
        ...(excludeSetId ? { setId: { not: excludeSetId } } : {}),
      },
      include: {
        set: { select: { title: true } },
        package: {
          select: {
            listeningTestId: true,
            readingTestId: true,
            writingTestId: true,
            contentPool: { select: { testId: true, skill: true } },
          },
        },
      },
    });

    const blockedTestIds = new Set<string>();
    for (const item of otherSetItems) {
      for (const testId of this.collectPackageTestIds(item.package)) {
        blockedTestIds.add(testId);
      }
    }

    const currentSetTestIds = new Set<string>();
    if (excludeSetId) {
      const currentItems = await this.prisma.institutionMockSetItem.findMany({
        where: { setId: excludeSetId },
        include: {
          package: {
            select: {
              listeningTestId: true,
              readingTestId: true,
              writingTestId: true,
              contentPool: { select: { testId: true } },
            },
          },
        },
      });
      for (const item of currentItems) {
        for (const testId of this.collectPackageTestIds(item.package)) {
          currentSetTestIds.add(testId);
        }
      }
    }

    for (const pkg of packages) {
      for (const testId of this.collectPackageTestIds(pkg)) {
        if (blockedTestIds.has(testId) && !currentSetTestIds.has(testId)) {
          const test = await this.prisma.contentTest.findUnique({
            where: { id: testId },
            select: { code: true },
          });
          throw new BadRequestException(
            `Test ${test?.code ?? testId} is already used in another institution mock set`,
          );
        }
      }
    }
  }

  private async syncSetItems(setId: string, packageIds: string[]) {
    const uniqueIds = [...new Set(packageIds)];

    await this.prisma.$transaction(async (tx) => {
      await tx.institutionMockSetItem.deleteMany({ where: { setId } });
      if (uniqueIds.length > 0) {
        await tx.institutionMockSetItem.createMany({
          data: uniqueIds.map((packageId, index) => ({
            setId,
            packageId,
            sortOrder: index,
          })),
        });
      }
    });
  }
}
