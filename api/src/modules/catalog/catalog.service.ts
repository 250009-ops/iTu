import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CatalogService {
  constructor(private prisma: PrismaService) {}

  async listPackages() {
    const packages = await this.prisma.mockTestPackage.findMany({
      where: { isActive: true },
      orderBy: [{ mostPopular: 'desc' }, { price: 'desc' }],
    });

    return packages.map((pkg) => ({
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
    }));
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

    if (!pkg) return null;

    return {
      id: pkg.id,
      slug: pkg.slug,
      title: pkg.title,
      description: pkg.description,
      price: pkg.price,
      currency: pkg.currency,
      skills: pkg.skills,
      included: pkg.included,
      rules: pkg.rules,
      tests: {
        listening: pkg.listeningTest,
        reading: pkg.readingTest,
        writing: pkg.writingTest,
        speaking: pkg.speakingBank,
      },
    };
  }
}
