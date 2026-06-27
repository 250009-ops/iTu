import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, WritingAiEvaluationStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  WRITING_MIN_WORDS,
  applyWordCountPenaltyToScores,
  countWords,
} from './writing-word-count';

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
};

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
  ) {}

  isConfigured(): boolean {
    return Boolean(this.config.get<string>('OPENAI_API_KEY')?.trim());
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
        generatedAt: null,
      },
    });

    await this.runEvaluation(submissionId);
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
          modelVersion: model,
          generatedAt: new Date(),
          errorMessage: null,
        },
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'AI evaluation failed';
      this.logger.error(`Writing AI evaluation failed for ${submissionId}: ${message}`);
      await this.prisma.writingAiEvaluation.update({
        where: { writingSubmissionId: submissionId },
        data: {
          status: WritingAiEvaluationStatus.FAILED,
          errorMessage: message,
        },
      });
    }
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

    for (const ann of raw.annotations ?? []) {
      const span = this.findTextSpan(essayText, ann.text);
      if (!span) continue;
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

    return { annotations, suggestedScores };
  }

  private findTextSpan(
    text: string,
    snippet: string,
  ): { start: number; end: number } | null {
    if (!snippet?.trim()) return null;
    const idx = text.indexOf(snippet);
    if (idx >= 0) {
      return { start: idx, end: idx + snippet.length };
    }
    const lowerIdx = text.toLowerCase().indexOf(snippet.toLowerCase());
    if (lowerIdx >= 0) {
      return { start: lowerIdx, end: lowerIdx + snippet.length };
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
        "explanation": "<1-2 plain English sentences for the teacher>",
        "suggestion": "<optional improved phrasing>"
      }
    ],
    "suggestedScores": {
      "taskAchievement": <0-9 in 0.5 steps>,
      "coherenceCohesion": <number>,
      "lexicalResource": <number>,
      "grammar": <number>
    }
  },
  "task2": {
    "annotations": [...],
    "suggestedScores": {
      "taskResponse": <0-9 in 0.5 steps>,
      "coherenceCohesion": <number>,
      "lexicalResource": <number>,
      "grammar": <number>
    }
  }
}

Rules:
- criterion "ta" = Task Achievement (Task 1) or Task Response (Task 2)
- criterion "cc" = Coherence & Cohesion
- criterion "lr" = Lexical Resource
- criterion "gra" = Grammatical Range & Accuracy
- Task 1 minimum: 150 words. Task 2 minimum: 250 words.
- When a response is below the minimum word count, penalise Task Achievement (Task 1) or Task Response (Task 2) heavily — typically band 4 or below when under 50% of the minimum
- Include an annotation about insufficient word count when below the minimum
- Include 3-8 annotations per task when the student wrote a substantive response; use an empty annotations array when the response is blank or "(empty)"
- "text" MUST be copied verbatim from the student essay (exact substring)
- Assign band 0 for every criterion when the student submitted no response for that task
- Be fair and examiner-like; scores should reflect the annotations`;

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
