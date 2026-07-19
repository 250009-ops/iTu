import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ContentTestStatus,
  PracticeUnitType,
  Prisma,
} from '@prisma/client';
import {
  normalizeBundle,
  PracticeBundle,
} from '../../common/practice/practice.types';
import { PrismaService } from '../../prisma/prisma.service';

export type PracticeContentOptionUnit = {
  id: string;
  code: string;
  title: string;
  type: string;
  skill: string;
  questionType: string | null;
  questionCount: number;
  status: string;
  isAssigned: boolean;
  assignedPackageId: string | null;
  assignedPackageTitle: string | null;
};

export type PracticeContentOptionPrompt = {
  id: string;
  code: string;
  title: string;
  taskNumber: number;
  status: string;
  isAssigned: boolean;
  assignedPackageId: string | null;
  assignedPackageTitle: string | null;
};

@Injectable()
export class PracticePackageContentService {
  constructor(private prisma: PrismaService) {}

  async listContentOptions(filters?: {
    type?: PracticeUnitType;
    taskNumber?: number;
    excludePackageId?: string;
  }) {
    const [units, prompts] = await Promise.all([
      this.listUnitOptions(filters?.type, filters?.excludePackageId),
      this.listPromptOptions(filters?.taskNumber, filters?.excludePackageId),
    ]);
    return { units, prompts };
  }

  async getPackageContent(packageId: string) {
    const pkg = await this.prisma.practiceProductPackage.findUnique({
      where: { id: packageId },
      include: {
        unitLinks: { select: { unitId: true } },
        promptLinks: { select: { promptId: true } },
      },
    });
    if (!pkg) throw new NotFoundException('Practice package not found');
    return {
      unitIds: pkg.unitLinks.map((l) => l.unitId),
      promptIds: pkg.promptLinks.map((l) => l.promptId),
    };
  }

  async isContentLocked(packageId: string): Promise<boolean> {
    const paidOrders = await this.prisma.order.count({
      where: {
        practicePackageId: packageId,
        status: 'PAID',
        orderType: 'PRACTICE_BUNDLE',
      },
    });
    return paidOrders > 0;
  }

  async syncPackageContent(
    packageId: string,
    unitIds: string[],
    promptIds: string[],
  ): Promise<PracticeBundle> {
    const uniqueUnitIds = [...new Set(unitIds)];
    const uniquePromptIds = [...new Set(promptIds)];

    if (uniqueUnitIds.length === 0 && uniquePromptIds.length === 0) {
      throw new BadRequestException(
        'Package must include at least one practice unit or writing prompt',
      );
    }

    if (await this.isContentLocked(packageId)) {
      throw new BadRequestException(
        'Package content cannot be changed after students have purchased it',
      );
    }

    const units = uniqueUnitIds.length
      ? await this.prisma.practiceUnit.findMany({
          where: { id: { in: uniqueUnitIds } },
        })
      : [];

    if (units.length !== uniqueUnitIds.length) {
      throw new BadRequestException('One or more practice units were not found');
    }

    for (const unit of units) {
      if (unit.status !== ContentTestStatus.PUBLISHED) {
        throw new BadRequestException(
          `Practice unit ${unit.code} is not published`,
        );
      }
    }

    const prompts = uniquePromptIds.length
      ? await this.prisma.writingPracticePrompt.findMany({
          where: { id: { in: uniquePromptIds } },
        })
      : [];

    if (prompts.length !== uniquePromptIds.length) {
      throw new BadRequestException('One or more writing prompts were not found');
    }

    for (const prompt of prompts) {
      if (prompt.status !== ContentTestStatus.PUBLISHED) {
        throw new BadRequestException(
          `Writing prompt ${prompt.code} is not published`,
        );
      }
    }

    await this.assertExclusiveUnits(uniqueUnitIds, packageId);
    await this.assertExclusivePrompts(uniquePromptIds, packageId);

    const bundle = this.deriveBundle(units, uniquePromptIds.length);

    await this.prisma.$transaction(async (tx) => {
      await tx.practicePackageUnit.deleteMany({ where: { packageId } });
      await tx.practicePackageWritingPrompt.deleteMany({ where: { packageId } });

      if (uniqueUnitIds.length > 0) {
        await tx.practicePackageUnit.createMany({
          data: uniqueUnitIds.map((unitId) => ({ packageId, unitId })),
        });
      }

      if (uniquePromptIds.length > 0) {
        await tx.practicePackageWritingPrompt.createMany({
          data: uniquePromptIds.map((promptId) => ({ packageId, promptId })),
        });
      }

      await tx.practiceProductPackage.update({
        where: { id: packageId },
        data: { bundle: bundle as object },
      });
    });

    return bundle;
  }

  async createPackageWithContent(
    data: {
      slug: string;
      title: string;
      description?: string;
      price: number;
      currency?: string;
      displayPrices?: Record<string, number>;
      isActive?: boolean;
      mostPopular?: boolean;
    },
    unitIds: string[],
    promptIds: string[],
  ) {
    const pkg = await this.prisma.practiceProductPackage.create({
      data: {
        slug: data.slug.trim(),
        title: data.title.trim(),
        description: data.description ?? null,
        price: data.price,
        currency: data.currency ?? 'UZS',
        bundle: {} as object,
        displayPrices: data.displayPrices
          ? (data.displayPrices as Prisma.InputJsonValue)
          : undefined,
        isActive: data.isActive ?? false,
        mostPopular: data.mostPopular ?? false,
      },
    });

    const bundle = await this.syncPackageContent(pkg.id, unitIds, promptIds);
    return { ...pkg, bundle };
  }

  async grantAccessFromOrder(
    studentId: string,
    orderId: string,
    packageId: string,
  ) {
    const [unitLinks, promptLinks] = await Promise.all([
      this.prisma.practicePackageUnit.findMany({
        where: { packageId },
        select: { unitId: true },
      }),
      this.prisma.practicePackageWritingPrompt.findMany({
        where: { packageId },
        select: { promptId: true },
      }),
    ]);

    if (unitLinks.length === 0 && promptLinks.length === 0) return;

    await this.prisma.$transaction(async (tx) => {
      if (unitLinks.length > 0) {
        await tx.studentPracticeUnitAccess.createMany({
          data: unitLinks.map((link) => ({
            studentId,
            unitId: link.unitId,
            orderId,
            remaining: 1,
          })),
          skipDuplicates: true,
        });
      }

      if (promptLinks.length > 0) {
        await tx.studentPracticePromptAccess.createMany({
          data: promptLinks.map((link) => ({
            studentId,
            promptId: link.promptId,
            orderId,
            remaining: 1,
          })),
          skipDuplicates: true,
        });
      }
    });
  }

  formatContentSummary(bundle: PracticeBundle): string {
    const parts: string[] = [];
    if (bundle.readingPassages) {
      parts.push(`${bundle.readingPassages} reading passages`);
    }
    if (bundle.readingQuestionTypes) {
      parts.push(`${bundle.readingQuestionTypes} reading drills`);
    }
    if (bundle.listeningSections) {
      parts.push(`${bundle.listeningSections} listening sections`);
    }
    if (bundle.listeningQuestionTypes) {
      parts.push(`${bundle.listeningQuestionTypes} listening drills`);
    }
    if (bundle.aiWritingEssays) {
      parts.push(`${bundle.aiWritingEssays} AI essays`);
    }
    return parts.join(' · ') || '—';
  }

  deriveBundle(
    units: { type: PracticeUnitType }[],
    promptCount: number,
  ): PracticeBundle {
    const bundle: PracticeBundle = {};
    for (const unit of units) {
      switch (unit.type) {
        case PracticeUnitType.READING_PASSAGE:
          bundle.readingPassages = (bundle.readingPassages ?? 0) + 1;
          break;
        case PracticeUnitType.READING_QUESTION_TYPE:
          bundle.readingQuestionTypes = (bundle.readingQuestionTypes ?? 0) + 1;
          break;
        case PracticeUnitType.LISTENING_SECTION:
          bundle.listeningSections = (bundle.listeningSections ?? 0) + 1;
          break;
        case PracticeUnitType.LISTENING_QUESTION_TYPE:
          bundle.listeningQuestionTypes =
            (bundle.listeningQuestionTypes ?? 0) + 1;
          break;
      }
    }
    if (promptCount > 0) {
      bundle.aiWritingEssays = promptCount;
    }
    return normalizeBundle(bundle);
  }

  private async listUnitOptions(
    type?: PracticeUnitType,
    excludePackageId?: string,
  ): Promise<PracticeContentOptionUnit[]> {
    const units = await this.prisma.practiceUnit.findMany({
      where: {
        status: ContentTestStatus.PUBLISHED,
        ...(type ? { type } : {}),
      },
      orderBy: [{ type: 'asc' }, { title: 'asc' }],
      select: {
        id: true,
        code: true,
        title: true,
        type: true,
        skill: true,
        questionType: true,
        questionCount: true,
        status: true,
        packageLinks: {
          select: {
            packageId: true,
            package: { select: { id: true, title: true } },
          },
        },
      },
    });

    return units.map((unit) => {
      const link = unit.packageLinks[0];
      const assignedPackageId = link?.packageId ?? null;
      const isAssigned =
        Boolean(assignedPackageId) &&
        assignedPackageId !== excludePackageId;
      return {
        id: unit.id,
        code: unit.code,
        title: unit.title,
        type: unit.type,
        skill: unit.skill.toLowerCase(),
        questionType: unit.questionType,
        questionCount: unit.questionCount,
        status: unit.status.toLowerCase(),
        isAssigned,
        assignedPackageId,
        assignedPackageTitle: link?.package.title ?? null,
      };
    });
  }

  private async listPromptOptions(
    taskNumber?: number,
    excludePackageId?: string,
  ): Promise<PracticeContentOptionPrompt[]> {
    const prompts = await this.prisma.writingPracticePrompt.findMany({
      where: {
        status: ContentTestStatus.PUBLISHED,
        ...(taskNumber ? { taskNumber } : {}),
      },
      orderBy: [{ taskNumber: 'asc' }, { title: 'asc' }],
      select: {
        id: true,
        code: true,
        title: true,
        taskNumber: true,
        status: true,
        packageLinks: {
          select: {
            packageId: true,
            package: { select: { id: true, title: true } },
          },
        },
      },
    });

    return prompts.map((prompt) => {
      const link = prompt.packageLinks[0];
      const assignedPackageId = link?.packageId ?? null;
      const isAssigned =
        Boolean(assignedPackageId) &&
        assignedPackageId !== excludePackageId;
      return {
        id: prompt.id,
        code: prompt.code,
        title: prompt.title,
        taskNumber: prompt.taskNumber,
        status: prompt.status.toLowerCase(),
        isAssigned,
        assignedPackageId,
        assignedPackageTitle: link?.package.title ?? null,
      };
    });
  }

  private async assertExclusiveUnits(unitIds: string[], packageId: string) {
    if (unitIds.length === 0) return;

    const conflicts = await this.prisma.practicePackageUnit.findMany({
      where: {
        unitId: { in: unitIds },
        packageId: { not: packageId },
      },
      include: {
        unit: { select: { code: true } },
        package: { select: { title: true } },
      },
    });

    if (conflicts.length > 0) {
      const c = conflicts[0];
      throw new BadRequestException(
        `Practice unit ${c.unit.code} is already assigned to package "${c.package.title}"`,
      );
    }
  }

  private async assertExclusivePrompts(promptIds: string[], packageId: string) {
    if (promptIds.length === 0) return;

    const conflicts = await this.prisma.practicePackageWritingPrompt.findMany({
      where: {
        promptId: { in: promptIds },
        packageId: { not: packageId },
      },
      include: {
        prompt: { select: { code: true } },
        package: { select: { title: true } },
      },
    });

    if (conflicts.length > 0) {
      const c = conflicts[0];
      throw new BadRequestException(
        `Writing prompt ${c.prompt.code} is already assigned to package "${c.package.title}"`,
      );
    }
  }
}
