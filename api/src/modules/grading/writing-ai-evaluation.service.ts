import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  NotificationType,
  Prisma,
  WritingAiEvaluationStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { areAiFeaturesEnabled } from '../../common/ai/ai-features';
import { isWritingReadyForTeacherQueue } from '../../common/grading/writing-queue-visibility';
import { examinerWritingGradingDetailPath } from '../../common/examiner/examiner-routing';
import { NotificationsService } from '../notifications/notifications.service';
import { RealtimeService } from '../realtime/realtime.service';
import {
  WRITING_MIN_WORDS,
  applyWordCountPenaltyToScores,
  countWords,
} from './writing-word-count';
import {
  capSimpleTask1Scores,
  enrichTask1Annotations,
  enrichTask2Annotations,
} from './writing-ai-heuristics';

export type WritingAnnotationDto = {
  start: number;
  end: number;
  criterion: 'ta' | 'cc' | 'lr' | 'gra';
  title: string;
  explanation: string;
  suggestion?: string;
};

export type TaskAiResult = {
  annotations: WritingAnnotationDto[];
  suggestedScores: Record<string, number>;
  criterionSummaries?: Partial<Record<CriterionKey, string>>;
};

type RawAiAnnotation = {
  text: string;
  criterion: 'ta' | 'cc' | 'lr' | 'gra';
  title: string;
  explanation: string;
  suggestion?: string;
};

type RawAiTaskResult = {
  annotations: RawAiAnnotation[];
  suggestedScores: {
    taskAchievement?: number;
    taskResponse?: number;
    coherenceCohesion: number;
    lexicalResource: number;
    grammar: number;
  };
  criterionSummaries?: Partial<Record<CriterionKey, string>>;
};

type CriterionKey = 'ta' | 'cc' | 'lr' | 'gra';

type RawAiResponse = {
  task1: RawAiTaskResult;
  task2: RawAiTaskResult;
};

@Injectable()
export class WritingAiEvaluationService {
  private readonly logger = new Logger(WritingAiEvaluationService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private notifications: NotificationsService,
    private realtime: RealtimeService,
  ) {}

  isConfigured(): boolean {
    return (
      areAiFeaturesEnabled() &&
      Boolean(this.config.get<string>('OPENAI_API_KEY')?.trim())
    );
  }

  /** When AI is enabled, teachers only see submissions after analysis finishes. */
  isReadyForTeacherQueue(
    aiEvaluation: { status: WritingAiEvaluationStatus } | null | undefined,
  ): boolean {
    return isWritingReadyForTeacherQueue(aiEvaluation);
  }

  async getOrTriggerEvaluation(submissionId: string): Promise<void> {
    if (!this.isConfigured()) return;

    const submission = await this.prisma.writingSubmission.findUnique({
      where: { id: submissionId },
      select: { task1Text: true, task2Text: true },
    });
    if (!submission) return;

    const existing = await this.prisma.writingAiEvaluation.findUnique({
      where: { writingSubmissionId: submissionId },
    });

    if (existing?.status === WritingAiEvaluationStatus.READY) {
      if (this.isStaleEvaluation(existing, submission)) {
        await this.prisma.writingAiEvaluation.update({
          where: { writingSubmissionId: submissionId },
          data: { status: WritingAiEvaluationStatus.QUEUED, errorMessage: null },
        });
        void this.runEvaluation(submissionId);
        return;
      }
      return;
    }

    if (
      existing &&
      (existing.status === WritingAiEvaluationStatus.PROCESSING ||
        existing.status === WritingAiEvaluationStatus.QUEUED)
    ) {
      if (existing.status === WritingAiEvaluationStatus.QUEUED) {
        void this.runEvaluation(submissionId);
      }
      return;
    }

    if (existing?.status === WritingAiEvaluationStatus.FAILED) {
      if (existing.errorMessage == null) {
        return;
      }
      await this.prisma.writingAiEvaluation.update({
        where: { writingSubmissionId: submissionId },
        data: { status: WritingAiEvaluationStatus.QUEUED, errorMessage: null },
      });
    } else {
      await this.prisma.writingAiEvaluation.create({
        data: {
          writingSubmissionId: submissionId,
          status: WritingAiEvaluationStatus.QUEUED,
        },
      });
    }

    void this.runEvaluation(submissionId);
  }

  async retryEvaluation(submissionId: string): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    await this.prisma.writingAiEvaluation.upsert({
      where: { writingSubmissionId: submissionId },
      create: {
        writingSubmissionId: submissionId,
        status: WritingAiEvaluationStatus.QUEUED,
      },
      update: {
        status: WritingAiEvaluationStatus.QUEUED,
        errorMessage: null,
        task1Annotations: Prisma.JsonNull,
        task2Annotations: Prisma.JsonNull,
        task1SuggestedScores: Prisma.JsonNull,
        task2SuggestedScores: Prisma.JsonNull,
        task1CriterionSummaries: Prisma.JsonNull,
        task2CriterionSummaries: Prisma.JsonNull,
        generatedAt: null,
      },
    });

    await this.runEvaluation(submissionId);
  }

  /** Trigger AI evaluation and wait until ready, failed, or timeout. */
  async waitForEvaluation(
    submissionId: string,
    maxWaitMs = 90_000,
  ): Promise<{ status: string }> {
    if (!this.isConfigured()) {
      return { status: 'unconfigured' };
    }

    await this.getOrTriggerEvaluation(submissionId);
    const deadline = Date.now() + maxWaitMs;

    while (Date.now() < deadline) {
      const evaluation = await this.prisma.writingAiEvaluation.findUnique({
        where: { writingSubmissionId: submissionId },
        select: { status: true },
      });
      const status = evaluation?.status?.toLowerCase() ?? 'queued';
      if (
        status === WritingAiEvaluationStatus.READY.toLowerCase() ||
        status === WritingAiEvaluationStatus.FAILED.toLowerCase()
      ) {
        return { status };
      }
      await new Promise((r) => setTimeout(r, 2000));
    }

    return { status: 'timeout' };
  }

  private async runEvaluation(submissionId: string): Promise<void> {
    const apiKey = this.config.get<string>('OPENAI_API_KEY')?.trim();
    if (!apiKey) return;

    await this.prisma.writingAiEvaluation.update({
      where: { writingSubmissionId: submissionId },
      data: { status: WritingAiEvaluationStatus.PROCESSING },
    });

    try {
      const submission = await this.prisma.writingSubmission.findUnique({
        where: { id: submissionId },
        include: {
          sectionAttempt: {
            include: { contentTest: { select: { content: true } } },
          },
        },
      });

      if (!submission) {
        throw new Error('Submission not found');
      }

      const content = submission.sectionAttempt.contentTest?.content as
        | { tasks?: { taskNumber?: number; prompt?: string }[] }
        | undefined;
      const tasks = content?.tasks ?? [];
      const task1Prompt =
        tasks.find((t) => t.taskNumber === 1)?.prompt ?? 'Task 1 prompt unavailable';
      const task2Prompt =
        tasks.find((t) => t.taskNumber === 2)?.prompt ?? 'Task 2 prompt unavailable';

      const task1Text = submission.task1Text?.trim() ?? '';
      const task2Text = submission.task2Text?.trim() ?? '';

      const model =
        this.config.get<string>('OPENAI_MODEL')?.trim() || 'gpt-4o-mini';

      let task1: TaskAiResult;
      let task2: TaskAiResult;

      if (!task1Text && !task2Text) {
        task1 = this.emptyTaskResult('taskAchievement');
        task2 = this.emptyTaskResult('taskResponse');
      } else {
        const raw = await this.callOpenAi(apiKey, model, {
          task1Prompt,
          task2Prompt,
          task1Text,
          task2Text,
        });

        task1 = task1Text
          ? this.normalizeTaskResult(
              raw.task1,
              task1Text,
              'taskAchievement',
              WRITING_MIN_WORDS.task1,
            )
          : this.emptyTaskResult('taskAchievement');
        task2 = task2Text
          ? this.normalizeTaskResult(
              raw.task2,
              task2Text,
              'taskResponse',
              WRITING_MIN_WORDS.task2,
            )
          : this.emptyTaskResult('taskResponse');
      }

      await this.prisma.writingAiEvaluation.update({
        where: { writingSubmissionId: submissionId },
        data: {
          status: WritingAiEvaluationStatus.READY,
          task1Annotations: task1.annotations,
          task2Annotations: task2.annotations,
          task1SuggestedScores: task1.suggestedScores,
          task2SuggestedScores: task2.suggestedScores,
          task1CriterionSummaries: task1.criterionSummaries ?? Prisma.JsonNull,
          task2CriterionSummaries: task2.criterionSummaries ?? Prisma.JsonNull,
          modelVersion: model,
          generatedAt: new Date(),
          errorMessage: null,
        },
      });
      await this.notifyTeacherGradingReady(submissionId, true);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'AI evaluation failed';
      const infra = this.isInfrastructureError(message);
      this.logger.error(
        `Writing AI evaluation failed for ${submissionId}${infra ? ' (infrastructure)' : ''}: ${message}`,
      );
      await this.prisma.writingAiEvaluation.update({
        where: { writingSubmissionId: submissionId },
        data: {
          status: WritingAiEvaluationStatus.FAILED,
          errorMessage: infra ? null : message,
        },
      });
      await this.notifyTeacherGradingReady(submissionId, false);
    }
  }

  private isInfrastructureError(message: string): boolean {
    const lower = message.toLowerCase();
    return (
      lower.includes('openai api error 401') ||
      lower.includes('openai api error 403') ||
      lower.includes('openai api error 429') ||
      lower.includes('insufficient_quota') ||
      lower.includes('billing') ||
      lower.includes('api key') ||
      lower.includes('invalid_api_key') ||
      lower.includes('incorrect api key') ||
      lower.includes('rate limit') ||
      lower.includes('exceeded your current quota')
    );
  }

  /** True when AI highlights and suggestions are available to the examiner. */
  isAiUsable(
    aiEvaluation: { status: WritingAiEvaluationStatus } | null | undefined,
  ): boolean {
    return aiEvaluation?.status === WritingAiEvaluationStatus.READY;
  }

  private async notifyTeacherGradingReady(
    submissionId: string,
    aiSucceeded: boolean,
  ): Promise<void> {
    const submission = await this.prisma.writingSubmission.findUnique({
      where: { id: submissionId },
      select: {
        id: true,
        status: true,
        teacherId: true,
        teacher: { select: { userId: true, institutionId: true } },
      },
    });
    if (
      !submission?.teacher?.userId ||
      submission.status === 'GRADED' ||
      !submission.teacherId
    ) {
      return;
    }

    await this.notifications.create(
      submission.teacher.userId,
      'Writing ready to grade',
      aiSucceeded
        ? 'A student writing submission is now in your queue with AI highlights ready.'
        : 'A student writing submission is now in your queue.',
      NotificationType.GRADING,
      examinerWritingGradingDetailPath(
        submission.teacher.institutionId,
        submission.id,
      ),
    );
    this.realtime.notifyTeacherBadges(submission.teacherId);
  }

  private isStaleEvaluation(
    evaluation: {
      task1SuggestedScores: unknown;
      task2SuggestedScores: unknown;
    },
    submission: { task1Text: string | null; task2Text: string | null },
  ): boolean {
    const t1Empty = !submission.task1Text?.trim();
    const t2Empty = !submission.task2Text?.trim();
    if (!t1Empty && !t2Empty) return false;

    const t1Scores = evaluation.task1SuggestedScores as Record<
      string,
      number
    > | null;
    const t2Scores = evaluation.task2SuggestedScores as Record<
      string,
      number
    > | null;

    if (t1Empty && t1Scores) {
      if (Object.values(t1Scores).some((value) => value > 0)) return true;
    }
    if (t2Empty && t2Scores) {
      if (Object.values(t2Scores).some((value) => value > 0)) return true;
    }
    return false;
  }

  private emptyTaskResult(
    primaryKey: 'taskAchievement' | 'taskResponse',
  ): TaskAiResult {
    const suggestedScores: Record<string, number> = {
      coherenceCohesion: 0,
      lexicalResource: 0,
      grammar: 0,
    };
    suggestedScores[primaryKey] = 0;
    return { annotations: [], suggestedScores };
  }

  private normalizeTaskResult(
    raw: RawAiTaskResult,
    essayText: string,
    primaryKey: 'taskAchievement' | 'taskResponse',
    minWords: number,
  ): TaskAiResult {
    if (!essayText.trim()) {
      return this.emptyTaskResult(primaryKey);
    }

    const wordCount = countWords(essayText);
    const annotations: WritingAnnotationDto[] = [];
    const usedRanges: Array<{ start: number; end: number }> = [];

    for (const ann of raw.annotations ?? []) {
      const span = this.findTextSpan(essayText, ann.text, usedRanges);
      if (!span) continue;
      usedRanges.push(span);
      annotations.push({
        start: span.start,
        end: span.end,
        criterion: ann.criterion,
        title: ann.title,
        explanation: ann.explanation,
        suggestion: ann.suggestion,
      });
    }

    if (wordCount < minWords) {
      annotations.unshift({
        start: 0,
        end: Math.min(essayText.length, 1),
        criterion: 'ta',
        title: 'Under minimum word count',
        explanation: `The response is ${wordCount} words. IELTS requires at least ${minWords} words for this task — Task Achievement/Response must be penalised accordingly.`,
      });
    }

    const enriched =
      primaryKey === 'taskAchievement'
        ? enrichTask1Annotations(essayText, annotations, usedRanges)
        : enrichTask2Annotations(essayText, annotations, usedRanges);

    let suggestedScores: Record<string, number> = {
      coherenceCohesion: this.clampBand(raw.suggestedScores.coherenceCohesion),
      lexicalResource: this.clampBand(raw.suggestedScores.lexicalResource),
      grammar: this.clampBand(raw.suggestedScores.grammar),
    };

    if (primaryKey === 'taskAchievement') {
      suggestedScores.taskAchievement = this.clampBand(
        raw.suggestedScores.taskAchievement ?? raw.suggestedScores.taskResponse,
      );
    } else {
      suggestedScores.taskResponse = this.clampBand(
        raw.suggestedScores.taskResponse ?? raw.suggestedScores.taskAchievement,
      );
    }

    suggestedScores = applyWordCountPenaltyToScores(
      suggestedScores,
      primaryKey,
      wordCount,
      minWords,
    );

    if (primaryKey === 'taskAchievement') {
      suggestedScores = capSimpleTask1Scores(suggestedScores, essayText);
    }

    return {
      annotations: enriched,
      suggestedScores,
      criterionSummaries: raw.criterionSummaries,
    };
  }

  private findTextSpan(
    text: string,
    snippet: string,
    usedRanges: Array<{ start: number; end: number }> = [],
  ): { start: number; end: number } | null {
    if (!snippet?.trim()) return null;
    let searchFrom = 0;
    while (searchFrom < text.length) {
      let idx = text.indexOf(snippet, searchFrom);
      if (idx < 0) {
        idx = text.toLowerCase().indexOf(snippet.toLowerCase(), searchFrom);
      }
      if (idx < 0) return null;
      const span = { start: idx, end: idx + snippet.length };
      const overlaps = usedRanges.some(
        (u) => span.start < u.end && span.end > u.start,
      );
      if (!overlaps) return span;
      searchFrom = idx + 1;
    }
    return null;
  }

  private clampBand(value: unknown): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
    const clamped = Math.min(9, Math.max(0, value));
    return Math.round(clamped * 2) / 2;
  }

  private async callOpenAi(
    apiKey: string,
    model: string,
    input: {
      task1Prompt: string;
      task2Prompt: string;
      task1Text: string;
      task2Text: string;
    },
  ): Promise<RawAiResponse> {
    const systemPrompt = `You are an expert IELTS Writing examiner assistant. Analyze student essays against official IELTS band descriptors.

Return ONLY valid JSON matching this schema:
{
  "task1": {
    "annotations": [
      {
        "text": "<exact substring from the student essay>",
        "criterion": "ta" | "cc" | "lr" | "gra",
        "title": "<short issue title>",
        "explanation": "<1-2 plain English sentences explaining the issue against band descriptors>",
        "suggestion": "<concrete improved phrasing — quote the problematic phrase and show a better alternative>"
      }
    ],
    "suggestedScores": {
      "taskAchievement": <0-9 in 0.5 steps>,
      "coherenceCohesion": <number>,
      "lexicalResource": <number>,
      "grammar": <number>
    },
    "criterionSummaries": {
      "ta": "<2-3 sentences>",
      "cc": "<2-3 sentences>",
      "lr": "<2-3 sentences>",
      "gra": "<2-3 sentences>"
    }
  },
  "task2": { ... same shape with taskResponse instead of taskAchievement ... }
}

IELTS TASK 1 (Academic Report) — check ALL of these:
- NO personal opinion ("I think", "I believe", "In my opinion")
- NO essay-style conclusion ("In conclusion", "To sum up" with opinion)
- MUST include an overview of main trends/comparisons (not just data listing)
- Report format: describe data objectively (charts, tables, maps, processes)
- Penalise TA if only data is listed without overview or key comparisons
- Simple reports at minimum word count (150–180 words) with basic overview: max TA ~6.5 even if accurate — Band 7+ needs fuller development
- Flag repeated phrases (e.g. "rose steadily", "the figure") with lr annotations — suggestion must name the repeated phrase and give alternatives

IELTS TASK 2 (Essay) — check ALL of these:
- MUST have clear introduction with thesis/position
- MUST have at least 2 body paragraphs with one main idea each
- MUST have a conclusion paragraph restating position (flag if missing — ta annotation)
- Penalise TA if prompt not fully addressed or position unclear
- Flag repeated vocabulary/linking words with specific alternatives in suggestion

Criterion keys:
- "ta" = Task Achievement (Task 1) or Task Response (Task 2)
- "cc" = Coherence & Cohesion
- "lr" = Lexical Resource
- "gra" = Grammatical Range & Accuracy

Rules:
- Task 1 minimum: 150 words. Task 2 minimum: 250 words.
- When below minimum word count, penalise TA/TR heavily (typically max 4–5)
- Include 6–12 annotations per task with AT LEAST ONE per criterion (ta, cc, lr, gra)
- Each annotation "text" MUST be copied verbatim from the student essay
- Each "suggestion" MUST be specific: quote the issue and give a rewritten example
- For repetition: title "Repetitive vocabulary/structure", explanation states how many times the phrase appears, suggestion lists 2–3 alternative phrases
- Do NOT award Band 8–9 for short, simple, minimum-length responses
- Scores must align with annotations — be strict and examiner-like
- Assign band 0 for every criterion when the student submitted no response`;

    const task1Words = countWords(input.task1Text);
    const task2Words = countWords(input.task2Text);

    const userPrompt = `TASK 1 PROMPT:
${input.task1Prompt}

TASK 1 STUDENT RESPONSE (${task1Words} words — minimum ${WRITING_MIN_WORDS.task1}):
${input.task1Text || '(empty)'}

TASK 2 PROMPT:
${input.task2Prompt}

TASK 2 STUDENT RESPONSE (${task2Words} words — minimum ${WRITING_MIN_WORDS.task2}):
${input.task2Text || '(empty)'}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`OpenAI API error ${response.status}: ${errBody}`);
    }

    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('Empty response from OpenAI');
    }

    return JSON.parse(content) as RawAiResponse;
  }
}
