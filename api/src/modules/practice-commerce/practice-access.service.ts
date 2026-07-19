import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PracticeUnitType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PracticeAccessService {
  constructor(private prisma: PrismaService) {}

  async getAllowanceSummary(studentId: string) {
    const [unitAccess, promptAccess, wallet] = await Promise.all([
      this.prisma.studentPracticeUnitAccess.findMany({
        where: { studentId, remaining: { gt: 0 } },
        include: {
          unit: { select: { type: true } },
        },
      }),
      this.prisma.studentPracticePromptAccess.findMany({
        where: { studentId, remaining: { gt: 0 } },
      }),
      this.prisma.studentPracticeWallet.findUnique({ where: { studentId } }),
    ]);

    const byType = {
      readingPassages: 0,
      readingQuestionTypes: 0,
      listeningSections: 0,
      listeningQuestionTypes: 0,
      aiWritingEssays: promptAccess.reduce((sum, row) => sum + row.remaining, 0),
    };

    for (const row of unitAccess) {
      switch (row.unit.type) {
        case PracticeUnitType.READING_PASSAGE:
          byType.readingPassages += row.remaining;
          break;
        case PracticeUnitType.READING_QUESTION_TYPE:
          byType.readingQuestionTypes += row.remaining;
          break;
        case PracticeUnitType.LISTENING_SECTION:
          byType.listeningSections += row.remaining;
          break;
        case PracticeUnitType.LISTENING_QUESTION_TYPE:
          byType.listeningQuestionTypes += row.remaining;
          break;
      }
    }

    return {
      ...byType,
      wallet: wallet
        ? {
            readingPassages: wallet.readingPassages,
            readingQuestionTypes: wallet.readingQuestionTypes,
            listeningSections: wallet.listeningSections,
            listeningQuestionTypes: wallet.listeningQuestionTypes,
            aiWritingEssays: wallet.aiWritingEssays,
          }
        : null,
    };
  }

  async getAccessibleUnitIds(studentId: string): Promise<Set<string>> {
    const rows = await this.prisma.studentPracticeUnitAccess.findMany({
      where: { studentId, remaining: { gt: 0 } },
      select: { unitId: true },
    });
    return new Set(rows.map((r) => r.unitId));
  }

  async getAccessiblePromptIds(studentId: string): Promise<Set<string>> {
    const rows = await this.prisma.studentPracticePromptAccess.findMany({
      where: { studentId, remaining: { gt: 0 } },
      select: { promptId: true },
    });
    return new Set(rows.map((r) => r.promptId));
  }

  async consumeUnitAccess(studentId: string, unitId: string) {
    const access = await this.prisma.studentPracticeUnitAccess.findFirst({
      where: { studentId, unitId, remaining: { gt: 0 } },
      orderBy: { createdAt: 'asc' },
    });

    if (!access) {
      throw new BadRequestException(
        'You do not have access to this practice unit. Purchase a package to unlock it.',
      );
    }

    await this.prisma.studentPracticeUnitAccess.update({
      where: { id: access.id },
      data: { remaining: access.remaining - 1 },
    });

    return access;
  }

  async consumePromptAccess(studentId: string, promptId: string) {
    const access = await this.prisma.studentPracticePromptAccess.findFirst({
      where: { studentId, promptId, remaining: { gt: 0 } },
      orderBy: { createdAt: 'asc' },
    });

    if (!access) {
      throw new BadRequestException(
        'You do not have access to this writing prompt. Purchase a package to unlock it.',
      );
    }

    await this.prisma.studentPracticePromptAccess.update({
      where: { id: access.id },
      data: { remaining: access.remaining - 1 },
    });

    return access;
  }

  async hasUnitAccess(studentId: string, unitId: string): Promise<boolean> {
    const row = await this.prisma.studentPracticeUnitAccess.findFirst({
      where: { studentId, unitId, remaining: { gt: 0 } },
    });
    return Boolean(row);
  }

  async hasPromptAccess(studentId: string, promptId: string): Promise<boolean> {
    const row = await this.prisma.studentPracticePromptAccess.findFirst({
      where: { studentId, promptId, remaining: { gt: 0 } },
    });
    return Boolean(row);
  }

  async refundUnitAccess(studentId: string, unitId: string) {
    const access = await this.prisma.studentPracticeUnitAccess.findFirst({
      where: { studentId, unitId },
      orderBy: { createdAt: 'desc' },
    });
    if (!access) {
      throw new NotFoundException('Unit access record not found');
    }
    await this.prisma.studentPracticeUnitAccess.update({
      where: { id: access.id },
      data: { remaining: access.remaining + 1 },
    });
  }

  async refundPromptAccess(studentId: string, promptId: string) {
    const access = await this.prisma.studentPracticePromptAccess.findFirst({
      where: { studentId, promptId },
      orderBy: { createdAt: 'desc' },
    });
    if (!access) {
      throw new NotFoundException('Prompt access record not found');
    }
    await this.prisma.studentPracticePromptAccess.update({
      where: { id: access.id },
      data: { remaining: access.remaining + 1 },
    });
  }
}
