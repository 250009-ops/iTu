import { Injectable, NotFoundException } from '@nestjs/common';
import { ContentTestStatus, ContentTestType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ContentService {
  constructor(private prisma: PrismaService) {}

  async listTests(type?: ContentTestType) {
    const tests = await this.prisma.contentTest.findMany({
      where: type ? { type } : undefined,
      orderBy: { updatedAt: 'desc' },
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

    return tests.map((t) => ({
      id: t.id,
      code: t.code,
      title: t.title,
      type: t.type.toLowerCase(),
      status: t.status.toLowerCase(),
      version: t.version,
      durationMin: t.durationMin,
      updatedAt: t.updatedAt,
      publishedAt: t.publishedAt,
    }));
  }

  async getTest(id: string) {
    const test = await this.prisma.contentTest.findUnique({
      where: { id },
      include: { mediaAssets: true },
    });
    if (!test) throw new NotFoundException('Test not found');
    return test;
  }

  async createTest(data: {
    code: string;
    title: string;
    type: ContentTestType;
    content: object;
    answerKey?: object;
    durationMin?: number;
  }) {
    return this.prisma.contentTest.create({
      data: {
        code: data.code,
        title: data.title,
        type: data.type,
        content: data.content,
        answerKey: data.answerKey,
        durationMin: data.durationMin ?? 60,
        status: ContentTestStatus.DRAFT,
      },
    });
  }

  async publishTest(id: string) {
    return this.prisma.contentTest.update({
      where: { id },
      data: {
        status: ContentTestStatus.PUBLISHED,
        publishedAt: new Date(),
      },
    });
  }
}
