import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PracticeAttemptStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { callOpenAiJson, paragraphPlain } from './openai-json';
import { QuestionInsight, ReadingPassageLike } from './practice-ai.types';

@Injectable()
export class PracticeTutorService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  async listMessages(studentId: string, attemptId: string) {
    await this.getOwnedCompletedAttempt(studentId, attemptId);
    const messages = await this.prisma.practiceTutorMessage.findMany({
      where: { attemptId },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });
    return messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      sourceChipId: m.sourceChipId,
      questionN: m.questionN,
      createdAt: m.createdAt,
    }));
  }

  async ask(
    studentId: string,
    attemptId: string,
    body: {
      message?: string;
      chipId?: string;
      questionN?: number;
    },
  ) {
    const attempt = await this.getOwnedCompletedAttempt(studentId, attemptId);
    const chipText = this.chipToPrompt(body.chipId, body.questionN);
    const userText = (body.message?.trim() || chipText || '').trim();
    if (!userText) {
      throw new BadRequestException('Provide a message or chipId');
    }

    await this.prisma.practiceTutorMessage.create({
      data: {
        attemptId,
        role: 'user',
        content: userText,
        sourceChipId: body.chipId ?? null,
        questionN: body.questionN ?? null,
      },
    });

    const content = attempt.unit.content as { passages?: ReadingPassageLike[] };
    const passage = content.passages?.[0];
    const plain = passage
      ? paragraphPlain(passage.paragraphs)
      : '';
    const insights = (attempt.unit.aiPack?.questionInsights ??
      []) as QuestionInsight[];
    const selected =
      body.questionN != null
        ? insights.find((i) => i.n === body.questionN)
        : null;

    const history = await this.prisma.practiceTutorMessage.findMany({
      where: { attemptId },
      orderBy: { createdAt: 'desc' },
      take: 6,
    });
    history.reverse();

    const apiKey = this.config.get<string>('OPENAI_API_KEY')?.trim();
    const model =
      this.config.get<string>('OPENAI_MODEL')?.trim() || 'gpt-4o-mini';

    let reply: string;
    if (!apiKey) {
      reply = this.mockReply(userText, selected);
    } else {
      const parsed = await callOpenAiJson<{
        reply?: string;
        offTopic?: boolean;
        citeMarker?: string | null;
      }>({
        apiKey,
        model,
        temperature: 0.2,
        system: `You are a specialist IELTS Reading tutor for ONE passage only.
Hard rules:
- Never invent facts outside the passage.
- Cite paragraph markers like (¶C) when referring to evidence.
- ≤120 words per reply.
- No band score predictions.
- If the student goes off-topic, set offTopic=true and redirect to the passage in one short line.
Return JSON {reply, offTopic, citeMarker}.`,
        user: JSON.stringify({
          passage: plain.slice(0, 12000),
          answerKey: attempt.unit.answerKey,
          selectedQuestionInsight: selected,
          recentMessages: history.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          studentMessage: userText,
        }),
      });
      reply =
        parsed.reply?.trim() ||
        'Stay with this passage — ask about a specific question or paragraph.';
    }

    const saved = await this.prisma.practiceTutorMessage.create({
      data: {
        attemptId,
        role: 'assistant',
        content: reply,
        sourceChipId: body.chipId ?? null,
        questionN: body.questionN ?? null,
      },
    });

    return {
      id: saved.id,
      role: saved.role,
      content: saved.content,
      sourceChipId: saved.sourceChipId,
      questionN: saved.questionN,
      createdAt: saved.createdAt,
    };
  }

  private chipToPrompt(chipId?: string, questionN?: number): string | null {
    if (!chipId) return null;
    const n = questionN ?? Number(chipId.match(/\d+/)?.[0]);
    const map: Record<string, string> = {
      'why-not': `Why is my answer for Q${n} wrong? Explain briefly with evidence.`,
      'why-not-b': `For Q${n}, why is option B wrong?`,
      'ng-vs-false': `For Q${n}, is this Not Given or False? How do I decide?`,
      'summarize-para': 'Summarize the selected paragraph in one sentence.',
      paraphrase: `Show a paraphrase of the evidence for Q${n}.`,
      'scan-path': `Explain the scan path to find the answer to Q${n}.`,
    };
    if (map[chipId]) return map[chipId];
    if (chipId.startsWith('evidence-q') && Number.isFinite(n)) {
      return `Show me where Q${n} is answered and explain the scan path.`;
    }
    return null;
  }

  private mockReply(userText: string, insight: QuestionInsight | null | undefined) {
    if (insight?.evidence?.sentenceQuote) {
      return `Look at ¶${insight.evidence.paragraphMarker ?? '?'}: “${insight.evidence.sentenceQuote.slice(0, 120)}”. ${insight.rationale} (Configure OPENAI_API_KEY for fuller tutor replies.)`;
    }
    return `Stay with this passage. Re-read the relevant paragraph and compare wording carefully. You asked: “${userText.slice(0, 80)}”.`;
  }

  private async getOwnedCompletedAttempt(studentId: string, attemptId: string) {
    const attempt = await this.prisma.practiceAttempt.findFirst({
      where: { id: attemptId, studentId },
      include: {
        unit: { include: { aiPack: true } },
      },
    });
    if (!attempt) throw new NotFoundException('Attempt not found');
    if (attempt.status !== PracticeAttemptStatus.COMPLETED) {
      throw new BadRequestException('Tutor chat opens after you submit');
    }
    return attempt;
  }
}
