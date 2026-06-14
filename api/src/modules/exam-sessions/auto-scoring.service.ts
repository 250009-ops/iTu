import { Injectable } from '@nestjs/common';
import { ExamSkill, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

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
    const normalize = (v: string) => v.trim().toLowerCase();

    if (Array.isArray(expected)) {
      if (!Array.isArray(submitted)) return false;
      const sortedExpected = [...expected].map(normalize).sort();
      const sortedSubmitted = submitted.map((s) => normalize(String(s))).sort();
      return JSON.stringify(sortedExpected) === JSON.stringify(sortedSubmitted);
    }

    const submittedStr = Array.isArray(submitted)
      ? submitted.join(' ')
      : String(submitted ?? '');
    return normalize(submittedStr) === normalize(expected);
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
    return nearest?.band ?? null;
  }
}
