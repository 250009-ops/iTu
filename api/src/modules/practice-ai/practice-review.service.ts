import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PracticeAiPackStatus, PracticeAttemptStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { matchAnswer } from '../exam-sessions/answer-matching';
import {
  GlossaryEntry,
  ParaphraseDrill,
  QuestionInsight,
  VocabItem,
} from './practice-ai.types';
import { getStrategyTemplate, listStrategyTemplates } from './strategy-templates';

@Injectable()
export class PracticeReviewService {
  constructor(private prisma: PrismaService) {}

  async getReview(studentId: string, attemptId: string) {
    const attempt = await this.prisma.practiceAttempt.findFirst({
      where: { id: attemptId, studentId },
      include: {
        unit: {
          include: { aiPack: true },
        },
      },
    });
    if (!attempt) throw new NotFoundException('Attempt not found');
    if (attempt.status !== PracticeAttemptStatus.COMPLETED) {
      throw new BadRequestException('Submit the attempt before opening review');
    }

    const answerKey = (attempt.unit.answerKey ?? {}) as Record<
      string,
      string | string[]
    >;
    const answers = (attempt.answers ?? {}) as Record<string, unknown>;
    const pack = attempt.unit.aiPack;
    const insights = (pack?.questionInsights ?? []) as QuestionInsight[];
    const insightByN = new Map(insights.map((i) => [i.n, i]));

    const questionNumbers = [
      ...new Set(
        Object.keys(answerKey)
          .filter((k) => !k.startsWith('$set$'))
          .map((k) => Number(k))
          .filter((n) => Number.isFinite(n)),
      ),
    ].sort((a, b) => a - b);

    const items = questionNumbers.map((n) => {
      const expected = answerKey[String(n)];
      const submitted = answers[String(n)];
      const correct =
        expected != null ? matchAnswer(submitted as never, expected) : false;
      const insight = insightByN.get(n);
      return {
        n,
        yourAnswer: submitted ?? null,
        correctAnswer: expected ?? null,
        verdict: correct ? 'correct' : submitted == null || submitted === ''
          ? 'skipped'
          : 'incorrect',
        rationale: insight?.rationale ?? null,
        trap: insight?.trap ?? null,
        evidence: insight?.evidence ?? null,
        paraphraseMap: insight?.paraphraseMap ?? [],
        options: insight?.options ?? [],
        keywords: insight?.keywords ?? [],
        questionType: insight?.questionType ?? attempt.unit.questionType,
        degraded: insight?.degraded ?? !insight,
      };
    });

    const packReady = pack?.status === PracticeAiPackStatus.READY;

    return {
      attempt: {
        id: attempt.id,
        attemptCode: attempt.attemptCode,
        mode: attempt.mode,
        score: attempt.score,
        completedAt: attempt.completedAt,
      },
      unit: {
        id: attempt.unit.id,
        title: attempt.unit.title,
        type: attempt.unit.type,
        skill: attempt.unit.skill.toLowerCase(),
        questionType: attempt.unit.questionType,
        content: attempt.unit.content,
      },
      packStatus: pack?.status.toLowerCase() ?? 'missing',
      sectionStatus: pack?.sectionStatus ?? {},
      items,
      glossary: packReady ? ((pack?.glossary ?? []) as GlossaryEntry[]) : [],
      vocabPack: packReady ? ((pack?.vocabPack ?? []) as VocabItem[]) : [],
      paraphraseDrills: packReady
        ? ((pack?.paraphraseDrills ?? []) as ParaphraseDrill[])
        : [],
      skimScanTasks: packReady ? pack?.skimScanTasks : null,
      strategyPlaybook: packReady ? pack?.strategyPlaybook : null,
      strategyTemplates: listStrategyTemplates(),
      evidenceChips: items
        .filter((i) => i.evidence?.sentenceQuote)
        .map((i) => ({
          id: `evidence-q${i.n}`,
          label: `Show where Q${i.n} is answered`,
          questionN: i.n,
          paragraphMarker: i.evidence?.paragraphMarker ?? null,
          sentenceQuote: i.evidence?.sentenceQuote ?? '',
        })),
    };
  }

  async getStrategyForType(questionType: string) {
    const template = getStrategyTemplate(questionType);
    if (!template) throw new NotFoundException('Unknown question type');
    return template;
  }
}
