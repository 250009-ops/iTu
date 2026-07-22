import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  ContentTestStatus,
  ExamSkill,
  PracticeUnitType,
  Prisma,
} from '@prisma/client';
import { AuditAction } from '../../common/audit/audit.actions';
import { AuditService } from '../../common/audit/audit.service';
import { isUniqueConstraintError } from '../../common/id-allocation';
import { StorageService } from '../../common/storage/storage.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  assertPracticeUnitCode,
  assertWritingPromptCode,
  countQuestionsInContent,
  nextPracticeUnitCode,
  nextWritingPromptCode,
  passagePartFromPracticeContent,
  skillForUnitType,
  wrapListeningPartContent,
  wrapReadingPassageContent,
} from './practice-content.utils';

const AUDIO_MIME = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/ogg',
  'audio/mp4',
  'audio/x-m4a',
]);

const IMAGE_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

@Injectable()
export class PracticeContentService {
  private readonly logger = new Logger(PracticeContentService.name);

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private storage: StorageService,
  ) {}

  async listUnits(filters?: {
    type?: PracticeUnitType;
    skill?: ExamSkill;
    status?: ContentTestStatus;
  }) {
    const units = await this.prisma.practiceUnit.findMany({
      where: {
        ...(filters?.type ? { type: filters.type } : {}),
        ...(filters?.skill ? { skill: filters.skill } : {}),
        ...(filters?.status ? { status: filters.status } : {}),
      },
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { mediaAssets: true } } },
    });

    return units.map((u) => ({
      id: u.id,
      code: u.code,
      title: u.title,
      type: u.type,
      skill: u.skill.toLowerCase(),
      questionType: u.questionType,
      status: u.status.toLowerCase(),
      durationMin: u.durationMin,
      questionCount: countQuestionsInContent(u.skill, u.content),
      passagePart: passagePartFromPracticeContent(u.type, u.content),
      updatedAt: u.updatedAt,
      publishedAt: u.publishedAt,
      mediaCount: u._count.mediaAssets,
    }));
  }

  async getUnit(id: string) {
    const unit = await this.prisma.practiceUnit.findUnique({
      where: { id },
      include: { mediaAssets: true },
    });
    if (!unit) throw new NotFoundException('Practice unit not found');
    return unit;
  }

  async suggestNextUnitIdentity(
    type: PracticeUnitType,
    options?: { passagePart?: number; listeningPart?: number },
  ) {
    const code = await nextPracticeUnitCode(this.prisma, type, options);
    const skill = skillForUnitType(type);
    const typeLabel = type.replace(/_/g, ' ').toLowerCase();
    let title = `New ${typeLabel} practice`;
    if (type === 'READING_PASSAGE' && options?.passagePart) {
      title = `Reading Passage ${options.passagePart} practice`;
    } else if (type === 'LISTENING_SECTION' && options?.listeningPart) {
      title = `Listening Section ${options.listeningPart} practice`;
    }
    return {
      code,
      title,
      skill: skill.toLowerCase(),
      type,
    };
  }

  async createUnit(
    body: {
      code: string;
      title: string;
      type: PracticeUnitType;
      questionType?: string;
      content: object;
      answerKey?: object;
      durationMin?: number;
    },
    userId: string,
  ) {
    const code = body.code.trim().toUpperCase();
    const codeOptions = {
      passagePart:
        passagePartFromPracticeContent(body.type, body.content) ?? undefined,
      listeningPart:
        body.type === 'LISTENING_SECTION' || body.type === 'LISTENING_QUESTION_TYPE'
          ? passagePartFromPracticeContent(body.type, body.content) ?? undefined
          : undefined,
    };
    try {
      assertPracticeUnitCode(body.type, code, codeOptions);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Invalid practice unit code',
      );
    }

    const existing = await this.prisma.practiceUnit.findUnique({
      where: { code },
    });
    if (existing) {
      throw new ConflictException(
        'That practice code is already in use. Refresh the suggested code and try again.',
      );
    }

    const skill = skillForUnitType(body.type);
    const content = this.normalizeUnitContent(body.type, body.content);
    const questionCount = countQuestionsInContent(skill, content);

    let unit;
    try {
      unit = await this.prisma.practiceUnit.create({
        data: {
          code,
          title: body.title.trim(),
          type: body.type,
          skill,
          questionType: body.questionType ?? null,
          content: content as object,
          answerKey: body.answerKey
            ? (body.answerKey as Prisma.InputJsonValue)
            : undefined,
          durationMin: body.durationMin ?? (skill === ExamSkill.LISTENING ? 10 : 20),
          questionCount,
          status: ContentTestStatus.DRAFT,
        },
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException(
          'That practice code was just taken. Refresh the suggested code and try again.',
        );
      }
      throw error;
    }

    await this.audit.log({
      userId,
      action: AuditAction.CONTENT_TEST_CREATE,
      entity: 'practice_unit',
      entityId: unit.id,
      metadata: { code: unit.code, type: unit.type },
    });

    return unit;
  }

  async updateUnit(
    id: string,
    body: {
      title?: string;
      questionType?: string;
      content?: object;
      answerKey?: object;
      durationMin?: number;
    },
    userId: string,
  ) {
    const existing = await this.getUnit(id);
    if (existing.status === ContentTestStatus.PUBLISHED) {
      throw new BadRequestException('Published units cannot be edited directly');
    }

    const content = body.content
      ? this.normalizeUnitContent(existing.type, body.content)
      : undefined;
    const questionCount = content
      ? countQuestionsInContent(existing.skill, content)
      : undefined;

    const unit = await this.prisma.practiceUnit.update({
      where: { id },
      data: {
        ...(body.title ? { title: body.title.trim() } : {}),
        ...(body.questionType !== undefined
          ? { questionType: body.questionType }
          : {}),
        ...(content ? { content: content as object } : {}),
        ...(body.answerKey !== undefined ? { answerKey: body.answerKey } : {}),
        ...(body.durationMin !== undefined ? { durationMin: body.durationMin } : {}),
        ...(questionCount !== undefined ? { questionCount } : {}),
      },
    });

    await this.audit.log({
      userId,
      action: AuditAction.CONTENT_TEST_UPDATE,
      entity: 'practice_unit',
      entityId: unit.id,
    });

    return unit;
  }

  async publishUnit(id: string, userId: string) {
    const unit = await this.getUnit(id);
    if (unit.status === ContentTestStatus.PUBLISHED) {
      return unit;
    }
    if (unit.questionCount < 1) {
      throw new BadRequestException('Unit must have at least one question');
    }
    if (
      unit.type.includes('QUESTION_TYPE') &&
      !unit.questionType?.trim()
    ) {
      throw new BadRequestException('Question type drills require questionType');
    }
    if (unit.skill === ExamSkill.LISTENING) {
      const hasAudio = unit.mediaAssets.some(
        (a) => a.key === 'full-audio' || a.key.startsWith('part-'),
      );
      if (!hasAudio) {
        throw new BadRequestException('Listening unit requires audio upload');
      }
    }

    const published = await this.prisma.practiceUnit.update({
      where: { id },
      data: {
        status: ContentTestStatus.PUBLISHED,
        publishedAt: new Date(),
      },
    });

    await this.audit.log({
      userId,
      action: AuditAction.CONTENT_TEST_PUBLISH,
      entity: 'practice_unit',
      entityId: id,
    });

    return published;
  }

  async archiveUnit(id: string, userId: string) {
    await this.getUnit(id);
    const unit = await this.prisma.practiceUnit.update({
      where: { id },
      data: { status: ContentTestStatus.ARCHIVED },
    });
    await this.audit.log({
      userId,
      action: AuditAction.CONTENT_TEST_ARCHIVE,
      entity: 'practice_unit',
      entityId: id,
    });
    return unit;
  }

  async deleteUnit(id: string) {
    const unit = await this.getUnit(id);
    if (unit.status !== ContentTestStatus.DRAFT) {
      throw new BadRequestException('Only draft units can be deleted');
    }
    await this.prisma.practiceUnit.delete({ where: { id } });
    return { deleted: true };
  }

  async uploadUnitMedia(
    id: string,
    key: string,
    file: Express.Multer.File,
  ) {
    const unit = await this.getUnit(id);
    const isAudio = key === 'full-audio' || /^part-[1-4]$/.test(key);
    const isImage = key === 'task1-image';

    if (isAudio && !AUDIO_MIME.has(file.mimetype)) {
      throw new BadRequestException('Invalid audio file type');
    }
    if (isImage && !IMAGE_MIME.has(file.mimetype)) {
      throw new BadRequestException('Invalid image file type');
    }

    const ext = file.originalname.split('.').pop() ?? 'bin';
    const relativePath = `practice/units/${id}/${key}.${ext}`;
    const url = await this.storage.saveBuffer(relativePath, file.buffer);

    await this.prisma.mediaAsset.upsert({
      where: {
        practiceUnitId_key: { practiceUnitId: id, key },
      },
      create: {
        practiceUnitId: id,
        key,
        url,
        mimeType: file.mimetype,
        sizeBytes: file.size,
      },
      update: {
        url,
        mimeType: file.mimetype,
        sizeBytes: file.size,
      },
    });

    return { key, url };
  }

  // Writing prompts
  async listWritingPrompts(status?: ContentTestStatus) {
    const prompts = await this.prisma.writingPracticePrompt.findMany({
      where: status ? { status } : {},
      orderBy: { updatedAt: 'desc' },
    });
    return prompts.map((p) => ({
      id: p.id,
      code: p.code,
      title: p.title,
      taskNumber: p.taskNumber,
      minWords: p.minWords,
      status: p.status.toLowerCase(),
      updatedAt: p.updatedAt,
      publishedAt: p.publishedAt,
    }));
  }

  async getWritingPrompt(id: string) {
    const prompt = await this.prisma.writingPracticePrompt.findUnique({
      where: { id },
    });
    if (!prompt) throw new NotFoundException('Writing prompt not found');
    return prompt;
  }

  async suggestNextPromptIdentity(taskNumber: number) {
    if (taskNumber !== 1 && taskNumber !== 2) {
      throw new BadRequestException('taskNumber must be 1 or 2');
    }
    const code = await nextWritingPromptCode(this.prisma, taskNumber);
    return {
      code,
      title: `Writing Task ${taskNumber} Practice Prompt`,
      taskNumber,
    };
  }

  async createWritingPrompt(
    body: {
      code: string;
      title: string;
      taskNumber: number;
      instruction: string;
      minWords?: number;
      imageUrl?: string;
    },
    userId: string,
  ) {
    const code = body.code.trim().toUpperCase();
    try {
      assertWritingPromptCode(code, body.taskNumber);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Invalid writing prompt code',
      );
    }

    const existing = await this.prisma.writingPracticePrompt.findUnique({
      where: { code },
    });
    if (existing) {
      throw new ConflictException(
        'That prompt code is already in use. Refresh the suggested code and try again.',
      );
    }

    let prompt;
    try {
      prompt = await this.prisma.writingPracticePrompt.create({
        data: {
          code,
          title: body.title.trim(),
          taskNumber: body.taskNumber,
          instruction: body.instruction,
          minWords: body.minWords ?? (body.taskNumber === 1 ? 150 : 250),
          imageUrl: body.imageUrl ?? null,
          status: ContentTestStatus.DRAFT,
        },
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException(
          'That prompt code was just taken. Refresh the suggested code and try again.',
        );
      }
      throw error;
    }
    await this.audit.log({
      userId,
      action: AuditAction.CONTENT_TEST_CREATE,
      entity: 'writing_practice_prompt',
      entityId: prompt.id,
    });
    return prompt;
  }

  async updateWritingPrompt(
    id: string,
    body: {
      title?: string;
      instruction?: string;
      minWords?: number;
      imageUrl?: string;
    },
    userId: string,
  ) {
    const existing = await this.getWritingPrompt(id);
    if (existing.status === ContentTestStatus.PUBLISHED) {
      throw new BadRequestException('Published prompts cannot be edited');
    }
    const prompt = await this.prisma.writingPracticePrompt.update({
      where: { id },
      data: {
        ...(body.title ? { title: body.title.trim() } : {}),
        ...(body.instruction !== undefined ? { instruction: body.instruction } : {}),
        ...(body.minWords !== undefined ? { minWords: body.minWords } : {}),
        ...(body.imageUrl !== undefined ? { imageUrl: body.imageUrl } : {}),
      },
    });
    await this.audit.log({
      userId,
      action: AuditAction.CONTENT_TEST_UPDATE,
      entity: 'writing_practice_prompt',
      entityId: id,
    });
    return prompt;
  }

  async publishWritingPrompt(id: string, userId: string) {
    const prompt = await this.getWritingPrompt(id);
    if (!prompt.instruction?.trim()) {
      throw new BadRequestException('Instruction is required');
    }
    const published = await this.prisma.writingPracticePrompt.update({
      where: { id },
      data: {
        status: ContentTestStatus.PUBLISHED,
        publishedAt: new Date(),
      },
    });
    await this.audit.log({
      userId,
      action: AuditAction.CONTENT_TEST_PUBLISH,
      entity: 'writing_practice_prompt',
      entityId: id,
    });
    return published;
  }

  async archiveWritingPrompt(id: string, userId: string) {
    await this.getWritingPrompt(id);
    return this.prisma.writingPracticePrompt.update({
      where: { id },
      data: { status: ContentTestStatus.ARCHIVED },
    });
  }

  private normalizeUnitContent(type: PracticeUnitType, content: object): object {
    const c = content as Record<string, unknown>;
    if (type === 'READING_PASSAGE' || type === 'READING_QUESTION_TYPE') {
      if (Array.isArray(c.passages)) {
        if (type === 'READING_PASSAGE') {
          return { ...content, passages: c.passages.slice(0, 1) };
        }
        return content;
      }
      if (c.id && c.groups) {
        return wrapReadingPassageContent(content);
      }
    }
    if (type === 'LISTENING_SECTION' || type === 'LISTENING_QUESTION_TYPE') {
      if (Array.isArray(c.parts)) return content;
      if (c.id && c.groups) {
        return wrapListeningPartContent(content);
      }
    }
    return content;
  }
}
