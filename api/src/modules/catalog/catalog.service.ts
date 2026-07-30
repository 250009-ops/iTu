import { Injectable } from '@nestjs/common';
import { ExamType } from '@prisma/client';
import {
  buildTabId,
  groupKey,
  isExcludedStudentOfferTab,
  offerMetaForGroup,
  sortOfferGroups,
  STUDENT_BROWSE_TAB_ORDER,
  type OfferGroup,
} from '../../common/catalog-offers';
import {
  computeFromPrice,
  packageIsExaminerPriced,
} from '../../common/booking-pricing';
import { CATALOG_CURRENCY } from '../../common/catalog-pricing';
import { offerDisplayTitle } from '../../common/package-naming';
import { PrismaService } from '../../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import {
  filterPackagesAvailableToStudent,
  resolveNextPackageForStudent,
} from '../content/content-assignment';

@Injectable()
export class CatalogService {
  constructor(
    private prisma: PrismaService,
    private settings: SettingsService,
  ) {}

  /**
   * Public marketing catalog: exactly one placeholder per student mock type
   * (Full Academic + 4 single-skill). Hides concrete mock serials (A001…).
   */
  async listPackages() {
    const packages = await this.prisma.mockTestPackage.findMany({
      where: { isActive: true, institutionId: null },
      orderBy: [
        { mostPopular: 'desc' },
        { mockNumber: 'asc' },
        { price: 'desc' },
      ],
    });

    const byGroup = new Map<string, (typeof packages)[number]>();
    for (const pkg of packages) {
      const tabId = buildTabId(pkg.packageKind, pkg.examType);
      if (isExcludedStudentOfferTab(tabId)) continue;
      const key = groupKey(pkg.packageKind, pkg.examType);
      if (!byGroup.has(key)) byGroup.set(key, pkg);
    }

    const ordered: Awaited<ReturnType<CatalogService['toPublicOfferPlaceholder']>>[] =
      [];
    for (const group of STUDENT_BROWSE_TAB_ORDER) {
      const pkg = byGroup.get(groupKey(group.packageKind, group.examType));
      if (!pkg) continue;
      const meta = offerMetaForGroup(group);
      ordered.push(await this.toPublicOfferPlaceholder(pkg, meta));
    }
    return ordered;
  }

  /** Active packages the student has not already taken or enrolled in. */
  async listPackagesForStudent(studentProfileId: string) {
    const packages = await this.prisma.mockTestPackage.findMany({
      where: { isActive: true, institutionId: null },
      orderBy: [{ mostPopular: 'desc' }, { price: 'desc' }],
    });

    const available = await filterPackagesAvailableToStudent(
      this.prisma,
      studentProfileId,
      packages,
    );

    return Promise.all(available.map((pkg) => this.toCatalogPackage(pkg)));
  }

  /**
   * One purchasable offer per mock type. Each offer resolves the lowest
   * mockNumber the student has not already enrolled in or completed.
   */
  async listOffersForStudent(studentProfileId: string) {
    const activePackages = await this.prisma.mockTestPackage.findMany({
      where: { isActive: true, institutionId: null },
      select: { packageKind: true, examType: true },
    });

    const seen = new Map<string, OfferGroup>();
    for (const pkg of activePackages) {
      const key = groupKey(pkg.packageKind, pkg.examType);
      if (isExcludedStudentOfferTab(buildTabId(pkg.packageKind, pkg.examType))) {
        continue;
      }
      if (!seen.has(key)) {
        seen.set(key, {
          packageKind: pkg.packageKind,
          examType: pkg.examType,
        });
      }
    }

    const offers = [];
    for (const group of sortOfferGroups([...seen.values()])) {
      const resolved = await resolveNextPackageForStudent(
        this.prisma,
        studentProfileId,
        {
          packageKind: group.packageKind,
          examType: group.examType,
        },
      );
      const meta = offerMetaForGroup(group);

      let activeEnrollment: {
        enrollmentCode: string;
        mockDate: Date;
        mockTime: string | null;
        packageTitle: string;
      } | null = null;

      if (!resolved) {
        const enrolled = await this.prisma.enrollment.findFirst({
          where: {
            studentId: studentProfileId,
            status: { in: ['ENROLLED', 'IN_PROGRESS', 'AWAITING_RESULTS'] },
            package: {
              packageKind: group.packageKind,
              examType: group.examType,
            },
          },
          orderBy: { mockDate: 'desc' },
          include: { package: { select: { title: true } } },
        });
        if (enrolled) {
          activeEnrollment = {
            enrollmentCode: enrolled.enrollmentCode,
            mockDate: enrolled.mockDate,
            mockTime: enrolled.mockTime,
            packageTitle: enrolled.package.title,
          };
        }
      }

      const packagePayload = resolved
        ? {
            ...(await this.toCatalogPackage(resolved)),
            title: meta.displayTitle,
            // Booking needs the concrete id; hide serial metadata from the client.
            mockNumber: undefined,
            slug: meta.tabId,
          }
        : null;

      if (activeEnrollment) {
        activeEnrollment = {
          ...activeEnrollment,
          packageTitle: meta.displayTitle,
        };
      }

      offers.push({
        ...meta,
        package: packagePayload,
        activeEnrollment,
      });
    }

    return offers;
  }

  async getPackage(slug: string) {
    // Public type placeholders use tab ids as slugs (e.g. full-academic).
    const tabGroup = STUDENT_BROWSE_TAB_ORDER.find(
      (g) => buildTabId(g.packageKind, g.examType) === slug,
    );
    if (tabGroup) {
      const offers = await this.listPackages();
      return offers.find((o) => o.slug === slug) ?? null;
    }

    const pkg = await this.prisma.mockTestPackage.findUnique({
      where: { slug },
      include: {
        listeningTest: { select: { id: true, code: true, title: true } },
        readingTest: { select: { id: true, code: true, title: true } },
        writingTest: { select: { id: true, code: true, title: true } },
        speakingBank: { select: { id: true, code: true, title: true } },
      },
    });

    if (!pkg || !pkg.isActive) return null;

    const displayTitle = offerDisplayTitle(pkg.packageKind, pkg.examType);

    return {
      ...(await this.toCatalogPackage(pkg)),
      title: displayTitle,
      mockNumber: undefined,
      tests: {
        listening: pkg.listeningTest
          ? { id: pkg.listeningTest.id, title: displayTitle }
          : null,
        reading: pkg.readingTest
          ? { id: pkg.readingTest.id, title: displayTitle }
          : null,
        writing: pkg.writingTest
          ? { id: pkg.writingTest.id, title: displayTitle }
          : null,
        speaking: pkg.speakingBank
          ? { id: pkg.speakingBank.id, title: displayTitle }
          : null,
      },
    };
  }

  /** Marketing/public offer — type key only; no concrete package UUID or serial. */
  private async toPublicOfferPlaceholder(
    pkg: {
      description: string | null;
      price: number;
      currency: string;
      examType: ExamType;
      packageKind: string;
      mostPopular: boolean;
      rating: number | null;
      reviewCount: number;
      skills: unknown;
      included: unknown;
      rules: unknown;
    },
    meta: ReturnType<typeof offerMetaForGroup>,
  ) {
    const pricing = await this.attachPricingMeta(pkg.skills, pkg.price, pkg.currency);
    return {
      id: meta.tabId,
      slug: meta.tabId,
      title: meta.displayTitle,
      description: pkg.description,
      ...pricing,
      examType: pkg.examType,
      packageKind: pkg.packageKind,
      mostPopular: pkg.mostPopular,
      rating: pkg.rating,
      reviewCount: pkg.reviewCount,
      skills: pkg.skills,
      included: pkg.included,
      rules: pkg.rules,
    };
  }

  private async toCatalogPackage(pkg: {
    id: string;
    slug: string;
    title: string;
    description: string | null;
    price: number;
    currency: string;
    examType: string;
    packageKind?: string;
    mockNumber?: number;
    mostPopular: boolean;
    rating: number | null;
    reviewCount: number;
    skills: unknown;
    included: unknown;
    rules: unknown;
  }) {
    const pricing = await this.attachPricingMeta(pkg.skills, pkg.price, pkg.currency);
    return {
      id: pkg.id,
      slug: pkg.slug,
      title: pkg.title,
      description: pkg.description,
      ...pricing,
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

  private async attachPricingMeta(
    skills: unknown,
    legacyPrice: number,
    legacyCurrency: string,
  ) {
    const examinerPriced = packageIsExaminerPriced(skills);
    if (!examinerPriced) {
      const fixed = computeFromPrice({
        skills,
        packagePrice: legacyPrice,
      });
      return {
        price: fixed.amount || legacyPrice,
        currency: fixed.currency || legacyCurrency || CATALOG_CURRENCY,
        pricingMode: 'fixed' as const,
        fromPrice: null as number | null,
        priceDependsOnExaminers: false,
      };
    }

    const floors = await this.settings.getMinExaminerGrossRates();
    const from = computeFromPrice({
      skills,
      writingMinGross: floors.writingMinGross,
      speakingMinGross: floors.speakingMinGross,
    });
    return {
      /** Display amount — "from" floor for examiner-priced offers. */
      price: from.amount,
      currency: from.currency,
      pricingMode: 'examiner' as const,
      fromPrice: from.amount,
      priceDependsOnExaminers: true,
    };
  }
}
