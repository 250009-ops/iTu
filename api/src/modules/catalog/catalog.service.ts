import { Injectable } from '@nestjs/common';
import { ExamType } from '@prisma/client';
import {
  groupKey,
  offerMetaForGroup,
  sortOfferGroups,
  STUDENT_BROWSE_TAB_ORDER,
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
    for (const group of STUDENT_BROWSE_TAB_ORDER) {
      seen.set(groupKey(group.packageKind, group.examType), group);
    }
    for (const pkg of activePackages) {
      const key = groupKey(pkg.packageKind, pkg.examType);
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
      offers.push({
        ...meta,
        package: resolved ? this.toCatalogPackage(resolved) : null,
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
      mostPopular: pkg.mostPopular,
      rating: pkg.rating,
      reviewCount: pkg.reviewCount,
      skills: pkg.skills,
      included: pkg.included,
      rules: pkg.rules,
    };
  }
}
