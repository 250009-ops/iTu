import { Injectable } from '@nestjs/common';
import { ExamSkill, Prisma } from '@prisma/client';
import { lookupBandFromRawScore } from '../../common/band-resolution';
import { PrismaService } from '../../prisma/prisma.service';
import { matchAnswer, normalizeAnswer } from './answer-matching';

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

    const answerByNumber = new Map(
      answers.map((a) => [a.questionNumber, a.value]),
    );
    const scoredNumbers = new Set<number>();
    let rawScore = 0;

    for (const [k, v] of Object.entries(answerKey)) {
      if (!k.startsWith('$set$') || typeof v !== 'string' || !v.trim()) continue;
      const match = k.match(/^\$set\$(\d+)-(\d+)$/);
      if (!match) continue;

      const from = Number(match[1]);
      const to = Number(match[2]);
      const expected = v
        .split(',')
        .map((s) => normalizeAnswer(s))
        .filter(Boolean)
        .sort();
      const nums: number[] = [];
      for (let n = from; n <= to; n++) nums.push(n);

      const submitted = nums
        .map((n) => answerByNumber.get(n))
        .filter((val) => typeof val === 'string' && val.trim())
        .map((val) => normalizeAnswer(String(val)))
        .sort();

      if (
        expected.length > 0 &&
        submitted.length === expected.length &&
        JSON.stringify(submitted) === JSON.stringify(expected)
      ) {
        rawScore += expected.length;
      }
      nums.forEach((n) => scoredNumbers.add(n));
    }

    for (const answer of answers) {
      if (scoredNumbers.has(answer.questionNumber)) continue;
      const key = answerKey[String(answer.questionNumber)];
      if (!key) continue;
      if (this.isCorrect(answer.value, key)) {
        if (Array.isArray(key) && Array.isArray(answer.value)) {
          rawScore += key.filter((entry) => String(entry).trim()).length;
        } else {
          rawScore++;
        }
      }
    }

    const band = await lookupBandFromRawScore(this.prisma, skill, rawScore);
    return { rawScore, band };
  }

  private isCorrect(
    submitted: Prisma.JsonValue,
    expected: string | string[],
  ): boolean {
    return matchAnswer(submitted, expected);
  }

  /** Resolve a band from a stored raw score (e.g. when backfilling results). */
  async lookupBandFromRawScore(
    skill: ExamSkill,
    rawScore: number,
  ): Promise<number | null> {
    return lookupBandFromRawScore(this.prisma, skill, rawScore);
  }
}
