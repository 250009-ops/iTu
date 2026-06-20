import { Injectable } from '@nestjs/common';
import { ExamSkill, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { matchAnswer } from './answer-matching';

@Injectable()
export class AutoScoringService {
  constructor(private prisma: PrismaService) {}

  async scoreListeningOrReading(
    skill: ExamSkill,
    answers: { questionNumber: number; value: Prisma.JsonValue }[],
    answerKey: Record<string, string | string[]> | null,
  ): Promise<{ rawScore: number; band: number | null }> {
    if (!answerKey) {
      return { rawScore: 0, band: null };
    }

    let rawScore = 0;
    for (const answer of answers) {
      const key = answerKey[String(answer.questionNumber)];
      if (!key) continue;
      if (this.isCorrect(answer.value, key)) {
        rawScore++;
      }
    }

    const band = await this.lookupBand(skill, rawScore);
    return { rawScore, band };
  }

  private isCorrect(
    submitted: Prisma.JsonValue,
    expected: string | string[],
  ): boolean {
    return matchAnswer(submitted, expected);
  }

  private async lookupBand(
    skill: ExamSkill,
    rawScore: number,
  ): Promise<number | null> {
    const row = await this.prisma.bandConversionTable.findFirst({
      where: { skill, rawScore, isActive: true },
      orderBy: { rawScore: 'desc' },
    });
    if (row) return row.band;

    const nearest = await this.prisma.bandConversionTable.findFirst({
      where: { skill, rawScore: { lte: rawScore }, isActive: true },
      orderBy: { rawScore: 'desc' },
    });
    if (nearest?.band != null) return nearest.band;
    return 2.5;
  }

  /** Resolve a band from a stored raw score (e.g. when backfilling results). */
  async lookupBandFromRawScore(
    skill: ExamSkill,
    rawScore: number,
  ): Promise<number | null> {
    return this.lookupBand(skill, rawScore);
  }
}
