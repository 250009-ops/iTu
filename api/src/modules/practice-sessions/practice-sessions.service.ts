import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ContentTestStatus,
  ExamSkill,
  PracticeAttemptStatus,
  PracticeUnitType,
} from '@prisma/client';
import { unitTypeToCreditType } from '../../common/practice/practice.types';
import { generateUniquePrefixedCode } from '../../common/id-allocation';
import { PracticeWalletService } from '../../common/practice/practice-wallet.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AutoScoringService } from '../exam-sessions/auto-scoring.service';
import { PracticeAccessService } from '../practice-commerce/practice-access.service';

@Injectable()
export class PracticeSessionsService {
  constructor(
    private prisma: PrismaService,
    private wallet: PracticeWalletService,
    private access: PracticeAccessService,
    private autoScoring: AutoScoringService,
  ) {}

  async listPublishedLibrary(
    studentId: string,
    filters?: {
      skill?: ExamSkill;
      type?: PracticeUnitType;
      questionType?: string;
    },
  ) {
    const accessibleIds = await this.access.getAccessibleUnitIds(studentId);

    const units = await this.prisma.practiceUnit.findMany({
      where: {
        status: ContentTestStatus.PUBLISHED,
        ...(filters?.skill ? { skill: filters.skill } : {}),
        ...(filters?.type ? { type: filters.type } : {}),
        ...(filters?.questionType ? { questionType: filters.questionType } : {}),
      },
      orderBy: [{ skill: 'asc' }, { type: 'asc' }, { title: 'asc' }],
      select: {
        id: true,
        code: true,
        title: true,
        type: true,
        skill: true,
        questionType: true,
        durationMin: true,
        questionCount: true,
        publishedAt: true,
      },
    });

    return units
      .filter((u) => accessibleIds.has(u.id))
      .map((u) => ({
        ...u,
        skill: u.skill.toLowerCase(),
        creditType: unitTypeToCreditType(u.type),
        entitled: true,
      }));
  }

  async listAttempts(studentId: string) {
    const attempts = await this.prisma.practiceAttempt.findMany({
      where: { studentId },
      orderBy: { startedAt: 'desc' },
      include: {
        unit: {
          select: {
            id: true,
            title: true,
            type: true,
            skill: true,
            questionType: true,
          },
        },
      },
      take: 50,
    });
    return attempts.map((a) => ({
      id: a.id,
      attemptCode: a.attemptCode,
      mode: a.mode,
      status: a.status.toLowerCase(),
      score: a.score,
      startedAt: a.startedAt,
      completedAt: a.completedAt,
      unit: {
        ...a.unit,
        skill: a.unit.skill.toLowerCase(),
      },
    }));
  }

  async startAttempt(
    studentId: string,
    unitId: string,
    mode: string = 'practice',
  ) {
    const unit = await this.prisma.practiceUnit.findUnique({
      where: { id: unitId },
      include: { mediaAssets: true },
    });
    if (!unit || unit.status !== ContentTestStatus.PUBLISHED) {
      throw new NotFoundException('Practice unit not available');
    }

    const allowedModes = new Set(['practice', 'skim', 'scan', 'guided']);
    const attemptMode = allowedModes.has(mode) ? mode : 'practice';

    const creditType = unitTypeToCreditType(unit.type);
    const attemptCode = await this.generateCode('PRA');

    let attemptId: string | null = null;
    try {
      await this.access.consumeUnitAccess(studentId, unitId);
      await this.wallet.consumeCredit(studentId, creditType, {
        reference: attemptCode,
      });

      const attempt = await this.prisma.practiceAttempt.create({
        data: {
          attemptCode,
          studentId,
          unitId,
          mode: attemptMode,
          status: PracticeAttemptStatus.IN_PROGRESS,
        },
      });
      attemptId = attempt.id;

      await this.prisma.practiceCreditTxn.updateMany({
        where: {
          studentId,
          reference: attemptCode,
          type: 'CONSUME',
        },
        data: { attemptId: attempt.id },
      });

      return {
      attempt: {
        id: attempt.id,
        attemptCode: attempt.attemptCode,
        status: attempt.status.toLowerCase(),
        mode: attempt.mode,
        startedAt: attempt.startedAt,
      },
      unit: this.formatUnitForPlayer(unit),
      };
    } catch (err) {
      if (attemptId) {
        await this.prisma.practiceAttempt.delete({ where: { id: attemptId } });
      } else {
        try {
          await this.access.refundUnitAccess(studentId, unitId);
        } catch {
          // access may not have been consumed yet
        }
      }
      throw err;
    }
  }

  async getAttempt(studentId: string, attemptId: string) {
    const attempt = await this.prisma.practiceAttempt.findFirst({
      where: { id: attemptId, studentId },
      include: {
        unit: { include: { mediaAssets: true } },
      },
    });
    if (!attempt) throw new NotFoundException('Attempt not found');
    return {
      attempt: {
        id: attempt.id,
        attemptCode: attempt.attemptCode,
        status: attempt.status.toLowerCase(),
        mode: attempt.mode,
        answers: attempt.answers,
        score: attempt.score,
        startedAt: attempt.startedAt,
        completedAt: attempt.completedAt,
      },
      unit: this.formatUnitForPlayer(attempt.unit),
    };
  }

  async saveAnswers(
    studentId: string,
    attemptId: string,
    answers: Record<string, unknown>,
  ) {
    const attempt = await this.prisma.practiceAttempt.findFirst({
      where: { id: attemptId, studentId },
    });
    if (!attempt) throw new NotFoundException('Attempt not found');
    if (attempt.status !== PracticeAttemptStatus.IN_PROGRESS) {
      throw new BadRequestException('Attempt is not in progress');
    }
    await this.prisma.practiceAttempt.update({
      where: { id: attemptId },
      data: { answers: answers as object },
    });
    return { saved: true };
  }

  async submitAttempt(studentId: string, attemptId: string) {
    const attempt = await this.prisma.practiceAttempt.findFirst({
      where: { id: attemptId, studentId },
      include: { unit: true },
    });
    if (!attempt) throw new NotFoundException('Attempt not found');
    if (attempt.status !== PracticeAttemptStatus.IN_PROGRESS) {
      throw new BadRequestException('Attempt already submitted');
    }

    const answersObj = (attempt.answers ?? {}) as Record<string, unknown>;
    const answerEntries = Object.entries(answersObj).map(
      ([questionNumber, value]) => ({
        questionNumber: Number(questionNumber),
        value: value as import('@prisma/client').Prisma.JsonValue,
      }),
    );

    const answerKey = attempt.unit.answerKey as Record<
      string,
      string | string[]
    > | null;

    const { rawScore, band } = await this.autoScoring.scoreListeningOrReading(
      attempt.unit.skill,
      answerEntries,
      answerKey,
    );

    const score = {
      rawScore,
      band,
      totalQuestions: attempt.unit.questionCount,
      correct: rawScore,
    };

    const updated = await this.prisma.practiceAttempt.update({
      where: { id: attemptId },
      data: {
        status: PracticeAttemptStatus.COMPLETED,
        score: score as object,
        completedAt: new Date(),
      },
    });

    return {
      attemptCode: updated.attemptCode,
      status: updated.status.toLowerCase(),
      score,
      answers: updated.answers,
      answerKey,
    };
  }

  private formatUnitForPlayer(unit: {
    id: string;
    title: string;
    type: PracticeUnitType;
    skill: ExamSkill;
    questionType: string | null;
    content: unknown;
    answerKey: unknown;
    durationMin: number;
    questionCount: number;
    mediaAssets: { key: string; url: string }[];
  }) {
    const content = { ...(unit.content as Record<string, unknown>) };
    if (unit.skill === ExamSkill.LISTENING && Array.isArray(content.parts)) {
      const parts = content.parts as Record<string, unknown>[];
      content.parts = parts.map((part, idx) => {
        const partNum = (part.part as number) ?? idx + 1;
        const audioAsset = unit.mediaAssets.find(
          (a) => a.key === `part-${partNum}` || a.key === 'full-audio',
        );
        return {
          ...part,
          audioUrl: audioAsset?.url ?? part.audioUrl,
        };
      });
      content.audioTracks = unit.mediaAssets
        .filter((a) => a.key.startsWith('part-') || a.key === 'full-audio')
        .map((a) => ({
          part: a.key === 'full-audio' ? 0 : Number(a.key.replace('part-', '')),
          url: a.url,
        }));
    }

    return {
      id: unit.id,
      title: unit.title,
      type: unit.type,
      skill: unit.skill.toLowerCase(),
      questionType: unit.questionType,
      content,
      durationMin: unit.durationMin,
      questionCount: unit.questionCount,
    };
  }

  private async generateCode(prefix: string): Promise<string> {
    return generateUniquePrefixedCode(
      (code) =>
        this.prisma.practiceAttempt
          .findUnique({ where: { attemptCode: code } })
          .then((row) => row != null),
      { prefix },
    );
  }
}
