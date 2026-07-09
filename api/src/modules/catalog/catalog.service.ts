import { Injectable } from '@nestjs/common';
import { ExamType } from '@prisma/client';
import {
  buildTabId,
  groupKey,
  isExcludedStudentOfferTab,
  offerMetaForGroup,
  sortOfferGroups,
  type OfferGroup,
} from '../../common/catalog-offers';
import { PrismaService } from '../../prisma/prisma.service';
import {
  filterPackagesAvailableToStudent,
  resolveNextPackageForStudent,
} from '../content/content-assignment';

@Injectable()
export class CatalogService {
  constructor(private prisma: PrismaService) {}

  async listPackages() {
    const packages = await this.prisma.mockTestPackage.findMany({
      where: { isActive: true },
      orderBy: [{ mostPopular: 'desc' }, { price: 'desc' }],
    });

    return packages.map((pkg) => this.toCatalogPackage(pkg));
  }

  /** Active packages the student has not already taken or enrolled in. */
  async listPackagesForStudent(studentProfileId: string) {
    const packages = await this.prisma.mockTestPackage.findMany({
      where: { isActive: true },
      orderBy: [{ mostPopular: 'desc' }, { price: 'desc' }],
    });

    const available = await filterPackagesAvailableToStudent(
      this.prisma,
      studentProfileId,
      packages,
    );

    return available.map((pkg) => this.toCatalogPackage(pkg));
  }

  /**
   * One purchasable offer per mock type. Each offer resolves the lowest
   * mockNumber the student has not already enrolled in or completed.
   */
  async listOffersForStudent(studentProfileId: string) {
    const activePackages = await this.prisma.mockTestPackage.findMany({
      where: { isActive: true },
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

      offers.push({
        ...meta,
        package: resolved ? this.toCatalogPackage(resolved) : null,
        activeEnrollment,
      });
    }

    return offers;
  }

  async getPackage(slug: string) {
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

    return {
      ...this.toCatalogPackage(pkg),
      tests: {
        listening: pkg.listeningTest,
        reading: pkg.readingTest,
        writing: pkg.writingTest,
        speaking: pkg.speakingBank,
      },
    };
  }

  private toCatalogPackage(pkg: {
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
}
