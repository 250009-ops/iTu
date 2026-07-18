import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ContentTestStatus,
  PracticeCreditType,
  Prisma,
  WritingPracticeSessionStatus,
} from '@prisma/client';
import { PracticeWalletService } from '../../common/practice/practice-wallet.service';
import { PrismaService } from '../../prisma/prisma.service';
import { countWords } from '../grading/writing-word-count';

export type WritingSections = {
  introduction: string;
  bodyParagraphs: string[];
  conclusion: string;
};

export type WritingImprovementAnnotation = {
  scope: 'word' | 'sentence';
  original: string;
  suggestion: string;
  category: 'grammar' | 'style' | 'vocabulary' | 'clarity';
  explanation?: string;
};

export type WritingImprovementFeedback = {
  improvedSections: WritingSections;
  annotations: WritingImprovementAnnotation[];
  summary: string;
  wordCount: number;
};

@Injectable()
export class WritingImprovementService {
  private readonly logger = new Logger(WritingImprovementService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private wallet: PracticeWalletService,
  ) {}

  isConfigured(): boolean {
    return Boolean(this.config.get<string>('OPENAI_API_KEY')?.trim());
  }

  async listPublishedPrompts(taskNumber?: number) {
    const prompts = await this.prisma.writingPracticePrompt.findMany({
      where: {
        status: ContentTestStatus.PUBLISHED,
        ...(taskNumber ? { taskNumber } : {}),
      },
      orderBy: { title: 'asc' },
      select: {
        id: true,
        code: true,
        title: true,
        taskNumber: true,
        minWords: true,
        instruction: true,
        imageUrl: true,
      },
    });
    return prompts;
  }

  async createSession(
    studentId: string,
    promptId: string,
    sections?: Partial<WritingSections>,
  ) {
    const prompt = await this.prisma.writingPracticePrompt.findUnique({
      where: { id: promptId },
    });
    if (!prompt || prompt.status !== ContentTestStatus.PUBLISHED) {
      throw new NotFoundException('Writing prompt not available');
    }

    const sessionCode = await this.generateCode('WPR');
    const defaultSections: WritingSections = {
      introduction: sections?.introduction ?? '',
      bodyParagraphs:
        sections?.bodyParagraphs && sections.bodyParagraphs.length > 0
          ? sections.bodyParagraphs
          : [''],
      conclusion: sections?.conclusion ?? '',
    };

    const session = await this.prisma.writingPracticeSession.create({
      data: {
        sessionCode,
        studentId,
        promptId,
        taskNumber: prompt.taskNumber,
        sections: defaultSections as object,
        status: WritingPracticeSessionStatus.DRAFT,
      },
      include: {
        prompt: {
          select: {
            id: true,
            title: true,
            taskNumber: true,
            instruction: true,
            minWords: true,
            imageUrl: true,
          },
        },
      },
    });

    return this.formatSession(session);
  }

  async updateSession(
    studentId: string,
    sessionId: string,
    sections: WritingSections,
  ) {
    const session = await this.getOwnedSession(studentId, sessionId);
    if (session.status !== WritingPracticeSessionStatus.DRAFT) {
      throw new BadRequestException('Session cannot be edited after analysis');
    }
    if (!sections.bodyParagraphs?.length) {
      throw new BadRequestException('At least one body paragraph is required');
    }

    const updated = await this.prisma.writingPracticeSession.update({
      where: { id: sessionId },
      data: { sections: sections as object },
      include: {
        prompt: {
          select: {
            id: true,
            title: true,
            taskNumber: true,
            instruction: true,
            minWords: true,
            imageUrl: true,
          },
        },
      },
    });
    return this.formatSession(updated);
  }

  async analyzeSession(studentId: string, sessionId: string) {
    const session = await this.getOwnedSession(studentId, sessionId, true);
    if (session.status === WritingPracticeSessionStatus.READY) {
      return this.formatSession(session);
    }
    if (session.status === WritingPracticeSessionStatus.ANALYZING) {
      return this.formatSession(session);
    }

    const sections = session.sections as WritingSections;
    const fullText = this.sectionsToText(sections);
    if (countWords(fullText) < 20) {
      throw new BadRequestException(
        'Write at least 20 words before requesting AI feedback',
      );
    }

    await this.wallet.consumeCredit(
      studentId,
      PracticeCreditType.AI_WRITING_ESSAY,
      { sessionId, reference: session.sessionCode },
    );

    await this.prisma.writingPracticeSession.update({
      where: { id: sessionId },
      data: {
        status: WritingPracticeSessionStatus.ANALYZING,
        creditConsumedAt: new Date(),
      },
    });

    try {
      const prompt = await this.prisma.writingPracticePrompt.findUnique({
        where: { id: session.promptId },
      });
      if (!prompt) throw new NotFoundException('Prompt not found');

      const feedback = await this.generateImprovement(
        prompt.instruction,
        session.taskNumber,
        sections,
      );

      const updated = await this.prisma.writingPracticeSession.update({
        where: { id: sessionId },
        data: {
          status: WritingPracticeSessionStatus.READY,
          aiFeedback: feedback as object,
        },
        include: {
          prompt: {
            select: {
              id: true,
              title: true,
              taskNumber: true,
              instruction: true,
              minWords: true,
              imageUrl: true,
            },
          },
        },
      });
      return this.formatSession(updated);
    } catch (err) {
      await this.wallet.refundCredit(
        studentId,
        PracticeCreditType.AI_WRITING_ESSAY,
        session.sessionCode,
      );
      await this.prisma.writingPracticeSession.update({
        where: { id: sessionId },
        data: { status: WritingPracticeSessionStatus.FAILED },
      });
      throw err;
    }
  }

  async getSession(studentId: string, sessionId: string) {
    const session = await this.getOwnedSession(studentId, sessionId, true);
    return this.formatSession(session);
  }

  async listSessions(studentId: string) {
    const sessions = await this.prisma.writingPracticeSession.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
      take: 30,
      include: {
        prompt: {
          select: { id: true, title: true, taskNumber: true },
        },
      },
    });
    return sessions.map((s) => this.formatSession(s));
  }

  private async generateImprovement(
    prompt: string,
    taskNumber: number,
    sections: WritingSections,
  ): Promise<WritingImprovementFeedback> {
    const apiKey = this.config.get<string>('OPENAI_API_KEY')?.trim();
    const fullText = this.sectionsToText(sections);

    if (!apiKey) {
      return this.mockFeedback(sections, fullText);
    }

    const model =
      this.config.get<string>('OPENAI_MODEL')?.trim() || 'gpt-4o-mini';

    const systemPrompt = `You are an IELTS Writing coach helping students improve their essays.
Focus on grammar fixes, clearer phrasing, vocabulary upgrades, and sentence structure — like QuillBot.
Do NOT assign band scores. Return valid JSON only.`;

    const userPrompt = JSON.stringify({
      taskNumber,
      prompt,
      sections,
      instruction:
        'Improve the essay section by section. Provide word-level and sentence-level suggestions for mistakes. Return JSON with: improvedSections (introduction, bodyParagraphs array, conclusion), annotations (array of {scope, original, suggestion, category, explanation}), summary (brief overall feedback).',
    });

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0.3,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenAI API error ${response.status}: ${errText}`);
    }

    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('Empty AI response');

    const parsed = JSON.parse(content) as Partial<WritingImprovementFeedback>;
    return {
      improvedSections: parsed.improvedSections ?? sections,
      annotations: parsed.annotations ?? [],
      summary: parsed.summary ?? 'Review the suggested improvements above.',
      wordCount: countWords(fullText),
    };
  }

  private mockFeedback(
    sections: WritingSections,
    fullText: string,
  ): WritingImprovementFeedback {
    return {
      improvedSections: sections,
      annotations: [],
      summary:
        'AI feedback is unavailable (OpenAI not configured). Your essay has been saved.',
      wordCount: countWords(fullText),
    };
  }

  private sectionsToText(sections: WritingSections): string {
    return [
      sections.introduction,
      ...sections.bodyParagraphs,
      sections.conclusion,
    ]
      .filter(Boolean)
      .join('\n\n');
  }

  private async getOwnedSession(
    studentId: string,
    sessionId: string,
    withPrompt = false,
  ) {
    const session = await this.prisma.writingPracticeSession.findFirst({
      where: { id: sessionId, studentId },
      include: withPrompt
        ? {
            prompt: {
              select: {
                id: true,
                title: true,
                taskNumber: true,
                instruction: true,
                minWords: true,
                imageUrl: true,
              },
            },
          }
        : undefined,
    });
    if (!session) throw new NotFoundException('Writing session not found');
    return session;
  }

  private formatSession(session: {
    id: string;
    sessionCode: string;
    taskNumber: number;
    sections: unknown;
    aiFeedback: unknown;
    status: WritingPracticeSessionStatus;
    creditConsumedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    prompt?: {
      id: string;
      title: string;
      taskNumber: number;
      instruction?: string;
      minWords?: number;
      imageUrl?: string | null;
    };
  }) {
    return {
      id: session.id,
      sessionCode: session.sessionCode,
      taskNumber: session.taskNumber,
      sections: session.sections as WritingSections,
      aiFeedback: session.aiFeedback as WritingImprovementFeedback | null,
      status: session.status.toLowerCase(),
      creditConsumedAt: session.creditConsumedAt,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      prompt: session.prompt,
    };
  }

  private async generateCode(prefix: string): Promise<string> {
    const num = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}-${num}`;
  }
}
